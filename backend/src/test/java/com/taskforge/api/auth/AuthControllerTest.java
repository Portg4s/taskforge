package com.taskforge.api.auth;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void registerCreatesUserAndReturnsToken() throws Exception {
		String email = "New.User." + UUID.randomUUID() + "@Example.COM";

		mockMvc.perform(post("/api/auth/register")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "email": "%s",
								  "password": "password-123",
								  "displayName": "New User"
								}
								""".formatted(email)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token", notNullValue()))
				.andExpect(jsonPath("$.user.id", notNullValue()))
				.andExpect(jsonPath("$.user.email").value(email.toLowerCase()))
				.andExpect(jsonPath("$.user.displayName").value("New User"))
				.andExpect(jsonPath("$.user.createdAt", notNullValue()))
				.andExpect(jsonPath("$.user.passwordHash").doesNotExist());
	}

	@Test
	void loginWithValidCredentialsReturnsToken() throws Exception {
		String email = "login-" + UUID.randomUUID() + "@taskforge.local";
		register(email, "password-123", "Login User");

		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "email": "%s",
								  "password": "password-123"
								}
								""".formatted(email)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token", notNullValue()))
				.andExpect(jsonPath("$.user.email").value(email));
	}

	@Test
	void loginWithInvalidPasswordReturnsUnauthorized() throws Exception {
		String email = "bad-login-" + UUID.randomUUID() + "@taskforge.local";
		register(email, "password-123", "Bad Login User");

		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "email": "%s",
								  "password": "wrong-password"
								}
								""".formatted(email)))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.message").value("Invalid email or password"));
	}

	@Test
	void meReturnsCurrentUserWithJwt() throws Exception {
		String email = "me-" + UUID.randomUUID() + "@taskforge.local";
		String token = register(email, "password-123", "Me User");

		mockMvc.perform(get("/api/auth/me")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id", notNullValue()))
				.andExpect(jsonPath("$.email").value(email))
				.andExpect(jsonPath("$.displayName").value("Me User"))
				.andExpect(jsonPath("$.createdAt", notNullValue()));
	}

	@Test
	void businessEndpointWithoutTokenReturnsUnauthorized() throws Exception {
		mockMvc.perform(get("/api/projects"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void businessEndpointWithTokenWorks() throws Exception {
		String token = register("business-" + UUID.randomUUID() + "@taskforge.local", "password-123", "Business User");

		mockMvc.perform(post("/api/projects")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "JWT Project"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", notNullValue()))
				.andExpect(jsonPath("$.name").value("JWT Project"));
	}

	@Test
	void userCannotAccessAnotherUsersProject() throws Exception {
		String ownerToken = register("owner-" + UUID.randomUUID() + "@taskforge.local", "password-123", "Owner");
		String otherToken = register("other-" + UUID.randomUUID() + "@taskforge.local", "password-123", "Other");

		String location = mockMvc.perform(post("/api/projects")
						.header("Authorization", "Bearer " + ownerToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Private Project"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn()
				.getResponse()
				.getHeader("Location");

		mockMvc.perform(get(location)
						.header("Authorization", "Bearer " + otherToken))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Project not found"));
	}

	private String register(String email, String password, String displayName) throws Exception {
		String response = mockMvc.perform(post("/api/auth/register")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "email": "%s",
								  "password": "%s",
								  "displayName": "%s"
								}
								""".formatted(email, password, displayName)))
				.andExpect(status().isOk())
				.andReturn()
				.getResponse()
				.getContentAsString();

		return JsonPath.read(response, "$.token");
	}
}
