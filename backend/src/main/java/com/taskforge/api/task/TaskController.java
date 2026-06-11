package com.taskforge.api.task;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.taskforge.api.task.dto.CreateTaskRequest;
import com.taskforge.api.task.dto.MoveTaskRequest;
import com.taskforge.api.task.dto.TaskResponse;
import com.taskforge.api.task.dto.UpdateTaskRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TaskController {

	private final TaskService taskService;

	public TaskController(TaskService taskService) {
		this.taskService = taskService;
	}

	@GetMapping("/boards/{boardId}/tasks")
	public List<TaskResponse> listBoardTasks(@PathVariable UUID boardId) {
		return taskService.listBoardTasks(boardId);
	}

	@GetMapping("/board-columns/{columnId}/tasks")
	public List<TaskResponse> listColumnTasks(@PathVariable UUID columnId) {
		return taskService.listColumnTasks(columnId);
	}

	@PostMapping("/board-columns/{columnId}/tasks")
	public ResponseEntity<TaskResponse> createTask(
			@PathVariable UUID columnId,
			@Valid @RequestBody CreateTaskRequest request) {
		TaskResponse response = taskService.createTask(columnId, request);

		return ResponseEntity.created(URI.create("/api/tasks/" + response.id()))
				.body(response);
	}

	@GetMapping("/tasks/{taskId}")
	public TaskResponse getTask(@PathVariable UUID taskId) {
		return taskService.getTask(taskId);
	}

	@PatchMapping("/tasks/{taskId}")
	public TaskResponse updateTask(
			@PathVariable UUID taskId,
			@Valid @RequestBody UpdateTaskRequest request) {
		return taskService.updateTask(taskId, request);
	}

	@PatchMapping("/tasks/{taskId}/move")
	public TaskResponse moveTask(
			@PathVariable UUID taskId,
			@Valid @RequestBody MoveTaskRequest request) {
		return taskService.moveTask(taskId, request);
	}

	@DeleteMapping("/tasks/{taskId}")
	public ResponseEntity<Void> deleteTask(@PathVariable UUID taskId) {
		taskService.deleteTask(taskId);

		return ResponseEntity.noContent().build();
	}
}
