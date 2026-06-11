package com.taskforge.api.project;

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
class ProjectControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void createsListsAndGetsProjectForDevUser() throws Exception {
		String projectName = "Learning Backend " + UUID.randomUUID();

		String location = mockMvc.perform(post("/api/projects")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "%s",
								  "description": "First project API"
								}
								""".formatted(projectName)))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", notNullValue()))
				.andExpect(jsonPath("$.id").isNotEmpty())
				.andExpect(jsonPath("$.name").value(projectName))
				.andExpect(jsonPath("$.description").value("First project API"))
				.andExpect(jsonPath("$.ownerId").isNotEmpty())
				.andReturn()
				.getResponse()
				.getHeader("Location");

		mockMvc.perform(get("/api/projects"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.name == '%s')]".formatted(projectName), hasSize(1)));

		mockMvc.perform(get(location))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value(projectName));
	}

	@Test
	void rejectsBlankProjectName() throws Exception {
		mockMvc.perform(post("/api/projects")
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
	void returnsNotFoundForUnknownProject() throws Exception {
		mockMvc.perform(get("/api/projects/{id}", UUID.randomUUID()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Project not found"));
	}

	@Test
	void updatesProjectFields() throws Exception {
		String originalName = "Original name " + UUID.randomUUID();

		String location = mockMvc.perform(post("/api/projects")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "%s",
								  "description": "Original description"
								}
								""".formatted(originalName)))
				.andReturn()
				.getResponse()
				.getHeader("Location");

		mockMvc.perform(patch(location)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Updated name"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Updated name"))
				.andExpect(jsonPath("$.description").value("Original description"));
	}

	@Test
	void deletesEmptyProject() throws Exception {
		String location = createProject("Empty Project " + UUID.randomUUID());

		mockMvc.perform(delete(location))
				.andExpect(status().isNoContent());

		mockMvc.perform(get(location))
				.andExpect(status().isNotFound());
	}

	@Test
	void rejectsDeletingProjectThatContainsBoards() throws Exception {
		String projectLocation = createProject("Project With Board " + UUID.randomUUID());
		createBoard(projectLocation, "Blocking Board " + UUID.randomUUID());

		mockMvc.perform(delete(projectLocation))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.message").value("Project contains boards and cannot be deleted"));
	}

	@Test
	void rejectsDeletingProjectThatContainsTasks() throws Exception {
		String projectLocation = createProject("Project With Task " + UUID.randomUUID());
		String boardLocation = createBoard(projectLocation, "Task Blocking Board " + UUID.randomUUID());
		String todoColumnId = firstColumnId(boardLocation);
		createTask(todoColumnId, "Blocking task");

		mockMvc.perform(delete(projectLocation))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.message").value("Project contains tasks and cannot be deleted"));
	}

	private String createProject(String projectName) throws Exception {
		return mockMvc.perform(post("/api/projects")
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

	private String firstColumnId(String boardLocation) throws Exception {
		return com.jayway.jsonpath.JsonPath.read(mockMvc.perform(get(boardLocation))
						.andExpect(status().isOk())
						.andReturn()
						.getResponse()
						.getContentAsString(), "$.columns[0].id");
	}

	private void createTask(String columnId, String title) throws Exception {
		mockMvc.perform(post("/api/board-columns/{columnId}/tasks", columnId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "%s"
								}
								""".formatted(title)))
				.andExpect(status().isCreated());
	}
}
