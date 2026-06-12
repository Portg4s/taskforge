package com.taskforge.api.board;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.taskforge.api.TestAuth;
import com.taskforge.api.auth.JwtService;
import com.taskforge.api.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BoardControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private JwtService jwtService;

	private String authorization;

	@Test
	void createsListsAndGetsBoardWithDefaultColumns() throws Exception {
		String projectLocation = createProject("Board API Project " + UUID.randomUUID());
		String boardName = "Product Board " + UUID.randomUUID();

		String boardLocation = mockMvc.perform(post(projectLocation + "/boards")
						.header("Authorization", authorization())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "%s"
								}
								""".formatted(boardName)))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", notNullValue()))
				.andExpect(jsonPath("$.id").isNotEmpty())
				.andExpect(jsonPath("$.name").value(boardName))
				.andExpect(jsonPath("$.projectId").isNotEmpty())
				.andExpect(jsonPath("$.columns", hasSize(3)))
				.andExpect(jsonPath("$.columns[0].name").value("Todo"))
				.andExpect(jsonPath("$.columns[0].position").value(0))
				.andExpect(jsonPath("$.columns[1].name").value("In Progress"))
				.andExpect(jsonPath("$.columns[1].position").value(1))
				.andExpect(jsonPath("$.columns[2].name").value("Done"))
				.andExpect(jsonPath("$.columns[2].position").value(2))
				.andReturn()
				.getResponse()
				.getHeader("Location");

		mockMvc.perform(get(projectLocation + "/boards")
						.header("Authorization", authorization()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.name == '%s')]".formatted(boardName), hasSize(1)));

		mockMvc.perform(get(boardLocation)
						.header("Authorization", authorization()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value(boardName))
				.andExpect(jsonPath("$.columns", hasSize(3)));
	}

	@Test
	void rejectsBlankBoardName() throws Exception {
		String projectLocation = createProject("Invalid Board Project " + UUID.randomUUID());

		mockMvc.perform(post(projectLocation + "/boards")
						.header("Authorization", authorization())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": " "
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").isNotEmpty());
	}

	@Test
	void returnsNotFoundForUnknownProjectAndBoard() throws Exception {
		mockMvc.perform(get("/api/projects/{projectId}/boards", UUID.randomUUID())
						.header("Authorization", authorization()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Project not found"));

		mockMvc.perform(get("/api/boards/{boardId}", UUID.randomUUID())
						.header("Authorization", authorization()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Board not found"));
	}

	@Test
	void updatesAndDeletesBoard() throws Exception {
		String projectLocation = createProject("Mutable Board Project " + UUID.randomUUID());
		String boardLocation = createBoard(projectLocation, "Original Board " + UUID.randomUUID());

		mockMvc.perform(patch(boardLocation)
						.header("Authorization", authorization())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Updated Board"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Updated Board"))
				.andExpect(jsonPath("$.columns", hasSize(3)));

		mockMvc.perform(delete(boardLocation)
						.header("Authorization", authorization()))
				.andExpect(status().isNoContent());

		mockMvc.perform(get(boardLocation)
						.header("Authorization", authorization()))
				.andExpect(status().isNotFound());
	}

	@Test
	void rejectsDeletingBoardThatContainsTasks() throws Exception {
		String projectLocation = createProject("Board With Task Project " + UUID.randomUUID());
		String boardLocation = createBoard(projectLocation, "Board With Task " + UUID.randomUUID());
		String todoColumnId = com.jayway.jsonpath.JsonPath.read(mockMvc.perform(get(boardLocation)
						.header("Authorization", authorization()))
						.andExpect(status().isOk())
						.andReturn()
						.getResponse()
						.getContentAsString(), "$.columns[0].id");

		mockMvc.perform(post("/api/board-columns/{columnId}/tasks", todoColumnId)
						.header("Authorization", authorization())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Blocking task"
								}
								"""))
				.andExpect(status().isCreated());

		mockMvc.perform(delete(boardLocation)
						.header("Authorization", authorization()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.message").value("Board contains tasks and cannot be deleted"));
	}

	private String createProject(String projectName) throws Exception {
		return mockMvc.perform(post("/api/projects")
						.header("Authorization", authorization())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "%s"
								}
								""".formatted(projectName)))
				.andExpect(status().isCreated())
				.andReturn()
				.getResponse()
				.getHeader("Location");
	}

	private String createBoard(String projectLocation, String boardName) throws Exception {
		return mockMvc.perform(post(projectLocation + "/boards")
						.header("Authorization", authorization())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "%s"
								}
								""".formatted(boardName)))
				.andExpect(status().isCreated())
				.andReturn()
				.getResponse()
				.getHeader("Location");
	}

	private String authorization() {
		if (authorization == null) {
			authorization = TestAuth.bearerToken(userRepository, passwordEncoder, jwtService);
		}

		return authorization;
	}
}
