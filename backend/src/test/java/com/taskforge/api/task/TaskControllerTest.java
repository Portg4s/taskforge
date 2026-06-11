package com.taskforge.api.task;

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
class TaskControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void createsListsGetsUpdatesMovesAndDeletesTasks() throws Exception {
		String boardLocation = createBoard("Task API Project " + UUID.randomUUID(), "Task Board " + UUID.randomUUID());
		String boardId = idFromLocation(boardLocation);
		String columnsResponse = getColumns(boardId);
		String todoId = JsonPath.read(columnsResponse, "$[0].id");
		String inProgressId = JsonPath.read(columnsResponse, "$[1].id");

		String firstTaskId = createTask(todoId, "Write task API", null)
				.andExpect(jsonPath("$.position").value(0))
				.andExpect(jsonPath("$.priority").value("MEDIUM"))
				.andReturn()
				.getResponse()
				.getHeader("Location")
				.substring("/api/tasks/".length());

		String secondTaskId = createTask(todoId, "Test task API", "HIGH")
				.andExpect(jsonPath("$.position").value(1))
				.andExpect(jsonPath("$.priority").value("HIGH"))
				.andReturn()
				.getResponse()
				.getHeader("Location")
				.substring("/api/tasks/".length());

		mockMvc.perform(get("/api/board-columns/{columnId}/tasks", todoId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(2)))
				.andExpect(jsonPath("$[0].id").value(firstTaskId))
				.andExpect(jsonPath("$[0].position").value(0))
				.andExpect(jsonPath("$[1].id").value(secondTaskId))
				.andExpect(jsonPath("$[1].position").value(1));

		mockMvc.perform(get("/api/boards/{boardId}/tasks", boardId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(2)));

		mockMvc.perform(get("/api/tasks/{taskId}", firstTaskId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(firstTaskId))
				.andExpect(jsonPath("$.title").value("Write task API"))
				.andExpect(jsonPath("$.boardId").value(boardId))
				.andExpect(jsonPath("$.columnId").value(todoId));

		mockMvc.perform(patch("/api/tasks/{taskId}", firstTaskId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Ship task API",
								  "description": "Cover the core task workflow",
								  "priority": "LOW",
								  "dueDate": "2026-12-24"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("Ship task API"))
				.andExpect(jsonPath("$.description").value("Cover the core task workflow"))
				.andExpect(jsonPath("$.priority").value("LOW"))
				.andExpect(jsonPath("$.dueDate").value("2026-12-24"));

		mockMvc.perform(patch("/api/tasks/{taskId}/move", secondTaskId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "columnId": "%s",
								  "position": 99
								}
								""".formatted(inProgressId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.columnId").value(inProgressId))
				.andExpect(jsonPath("$.position").value(0));

		mockMvc.perform(get("/api/board-columns/{columnId}/tasks", todoId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].id").value(firstTaskId))
				.andExpect(jsonPath("$[0].position").value(0));

		mockMvc.perform(patch("/api/tasks/{taskId}/move", firstTaskId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "columnId": "%s",
								  "position": 0
								}
								""".formatted(inProgressId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.columnId").value(inProgressId))
				.andExpect(jsonPath("$.position").value(0));

		mockMvc.perform(get("/api/board-columns/{columnId}/tasks", inProgressId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(2)))
				.andExpect(jsonPath("$[0].id").value(firstTaskId))
				.andExpect(jsonPath("$[0].position").value(0))
				.andExpect(jsonPath("$[1].id").value(secondTaskId))
				.andExpect(jsonPath("$[1].position").value(1));

		mockMvc.perform(delete("/api/tasks/{taskId}", firstTaskId))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/board-columns/{columnId}/tasks", inProgressId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].id").value(secondTaskId))
				.andExpect(jsonPath("$[0].position").value(0));
	}

	@Test
	void rejectsBlankTaskTitleOnCreate() throws Exception {
		String boardLocation = createBoard("Invalid Task Project " + UUID.randomUUID(), "Invalid Task Board");
		String todoId = JsonPath.read(getColumns(idFromLocation(boardLocation)), "$[0].id");

		mockMvc.perform(post("/api/board-columns/{columnId}/tasks", todoId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": " "
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").isNotEmpty());
	}

	@Test
	void returnsNotFoundForUnknownBoardColumnAndTask() throws Exception {
		mockMvc.perform(get("/api/boards/{boardId}/tasks", UUID.randomUUID()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Board not found"));

		mockMvc.perform(get("/api/board-columns/{columnId}/tasks", UUID.randomUUID()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Column not found"));

		mockMvc.perform(get("/api/tasks/{taskId}", UUID.randomUUID()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Task not found"));
	}

	@Test
	void rejectsMoveToColumnFromAnotherBoard() throws Exception {
		String boardLocation = createBoard("Move Task Project " + UUID.randomUUID(), "Move Task Board");
		String boardId = idFromLocation(boardLocation);
		String todoId = JsonPath.read(getColumns(boardId), "$[0].id");
		String taskId = createTask(todoId, "Cannot leave board", null)
				.andReturn()
				.getResponse()
				.getHeader("Location")
				.substring("/api/tasks/".length());

		String otherBoardLocation = createBoard("Other Move Task Project " + UUID.randomUUID(), "Other Move Task Board");
		String otherColumnId = JsonPath.read(getColumns(idFromLocation(otherBoardLocation)), "$[0].id");

		mockMvc.perform(patch("/api/tasks/{taskId}/move", taskId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "columnId": "%s",
								  "position": 0
								}
								""".formatted(otherColumnId)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value("Target column must belong to the same board"));
	}

	private org.springframework.test.web.servlet.ResultActions createTask(
			String columnId,
			String title,
			String priority) throws Exception {
		String priorityJson = priority == null ? "" : """
				,
				  "priority": "%s"
				""".formatted(priority);

		return mockMvc.perform(post("/api/board-columns/{columnId}/tasks", columnId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "%s"%s
								}
								""".formatted(title, priorityJson)))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", notNullValue()))
				.andExpect(jsonPath("$.id").isNotEmpty())
				.andExpect(jsonPath("$.title").value(title));
	}

	private String createBoard(String projectName, String boardName) throws Exception {
		String projectLocation = mockMvc.perform(post("/api/projects")
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

	private String getColumns(String boardId) throws Exception {
		return mockMvc.perform(get("/api/boards/{boardId}/columns", boardId))
				.andExpect(status().isOk())
				.andReturn()
				.getResponse()
				.getContentAsString();
	}

	private String idFromLocation(String location) {
		return location.substring(location.lastIndexOf('/') + 1);
	}
}
