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

import java.util.List;
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
class BoardColumnControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void listsCreatesUpdatesReordersAndDeletesColumns() throws Exception {
		String boardLocation = createBoard("Column API Project " + UUID.randomUUID(), "Column Board " + UUID.randomUUID());
		String boardId = idFromLocation(boardLocation);

		String columnsResponse = mockMvc.perform(get("/api/boards/{boardId}/columns", boardId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(3)))
				.andExpect(jsonPath("$[0].name").value("Todo"))
				.andExpect(jsonPath("$[0].position").value(0))
				.andExpect(jsonPath("$[1].name").value("In Progress"))
				.andExpect(jsonPath("$[1].position").value(1))
				.andExpect(jsonPath("$[2].name").value("Done"))
				.andExpect(jsonPath("$[2].position").value(2))
				.andReturn()
				.getResponse()
				.getContentAsString();

		String todoId = JsonPath.read(columnsResponse, "$[0].id");
		String inProgressId = JsonPath.read(columnsResponse, "$[1].id");
		String doneId = JsonPath.read(columnsResponse, "$[2].id");

		String reviewId = mockMvc.perform(post("/api/boards/{boardId}/columns", boardId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Review"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", notNullValue()))
				.andExpect(jsonPath("$.id").isNotEmpty())
				.andExpect(jsonPath("$.name").value("Review"))
				.andExpect(jsonPath("$.position").value(3))
				.andReturn()
				.getResponse()
				.getHeader("Location")
				.substring("/api/board-columns/".length());

		mockMvc.perform(patch("/api/board-columns/{columnId}", reviewId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "QA Review"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("QA Review"));

		mockMvc.perform(patch("/api/boards/{boardId}/columns/reorder", boardId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "columnIds": [
								    "%s",
								    "%s",
								    "%s",
								    "%s"
								  ]
								}
								""".formatted(doneId, todoId, reviewId, inProgressId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(4)))
				.andExpect(jsonPath("$[0].id").value(doneId))
				.andExpect(jsonPath("$[0].position").value(0))
				.andExpect(jsonPath("$[1].id").value(todoId))
				.andExpect(jsonPath("$[1].position").value(1))
				.andExpect(jsonPath("$[2].id").value(reviewId))
				.andExpect(jsonPath("$[2].position").value(2))
				.andExpect(jsonPath("$[3].id").value(inProgressId))
				.andExpect(jsonPath("$[3].position").value(3));

		mockMvc.perform(delete("/api/board-columns/{columnId}", reviewId))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/boards/{boardId}/columns", boardId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(3)));

		mockMvc.perform(post("/api/boards/{boardId}/columns", boardId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Post-release"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.position").value(4));
	}

	@Test
	void rejectsBlankColumnNameOnCreate() throws Exception {
		String boardLocation = createBoard("Invalid Column Project " + UUID.randomUUID(), "Invalid Column Board");
		String boardId = idFromLocation(boardLocation);

		mockMvc.perform(post("/api/boards/{boardId}/columns", boardId)
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
	void rejectsInvalidReorderRequests() throws Exception {
		String boardLocation = createBoard("Reorder Project " + UUID.randomUUID(), "Reorder Board");
		String boardId = idFromLocation(boardLocation);
		String columnsResponse = getColumns(boardId);
		String todoId = JsonPath.read(columnsResponse, "$[0].id");
		String inProgressId = JsonPath.read(columnsResponse, "$[1].id");
		String doneId = JsonPath.read(columnsResponse, "$[2].id");
		String otherBoardLocation = createBoard("Other Reorder Project " + UUID.randomUUID(), "Other Reorder Board");
		String otherBoardId = idFromLocation(otherBoardLocation);
		String otherColumnId = JsonPath.read(getColumns(otherBoardId), "$[0].id");

		mockMvc.perform(patch("/api/boards/{boardId}/columns/reorder", boardId)
						.contentType(MediaType.APPLICATION_JSON)
						.content(reorderBody(List.of(todoId, todoId, doneId))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Column order must not contain duplicates"));

		mockMvc.perform(patch("/api/boards/{boardId}/columns/reorder", boardId)
						.contentType(MediaType.APPLICATION_JSON)
						.content(reorderBody(List.of(todoId, inProgressId))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Column order must include every board column exactly once"));

		mockMvc.perform(patch("/api/boards/{boardId}/columns/reorder", boardId)
						.contentType(MediaType.APPLICATION_JSON)
						.content(reorderBody(List.of(todoId, inProgressId, otherColumnId))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Column order must include only columns from this board"));

		mockMvc.perform(patch("/api/boards/{boardId}/columns/reorder", boardId)
						.contentType(MediaType.APPLICATION_JSON)
						.content(reorderBody(List.of(todoId, inProgressId, UUID.randomUUID().toString()))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Column order must include only columns from this board"));
	}

	@Test
	void returnsNotFoundForUnknownBoardAndColumn() throws Exception {
		mockMvc.perform(get("/api/boards/{boardId}/columns", UUID.randomUUID()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Board not found"));

		mockMvc.perform(patch("/api/board-columns/{columnId}", UUID.randomUUID())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Renamed"
								}
								"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Column not found"));

		mockMvc.perform(delete("/api/board-columns/{columnId}", UUID.randomUUID()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Column not found"));
	}

	@Test
	void rejectsDeletingColumnThatContainsTasks() throws Exception {
		String boardLocation = createBoard("Column With Task Project " + UUID.randomUUID(), "Column With Task Board");
		String boardId = idFromLocation(boardLocation);
		String todoColumnId = JsonPath.read(getColumns(boardId), "$[0].id");

		mockMvc.perform(post("/api/board-columns/{columnId}/tasks", todoColumnId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "title": "Blocking task"
								}
								"""))
				.andExpect(status().isCreated());

		mockMvc.perform(delete("/api/board-columns/{columnId}", todoColumnId))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.message").value("Column contains tasks and cannot be deleted"));
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

	private String reorderBody(List<String> columnIds) {
		return """
				{
				  "columnIds": [
				    "%s"
				  ]
				}
				""".formatted(String.join("\",\n    \"", columnIds));
	}
}
