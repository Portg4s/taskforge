package com.taskforge.api.task.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.taskforge.api.task.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTaskRequest(
		@NotBlank
		@Size(max = 200)
		String title,
		String description,
		TaskPriority priority,
		LocalDate dueDate,
		UUID assigneeId) {
}
