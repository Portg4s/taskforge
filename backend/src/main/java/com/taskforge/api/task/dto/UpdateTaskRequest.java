package com.taskforge.api.task.dto;

import java.time.LocalDate;

import com.taskforge.api.task.TaskPriority;
import jakarta.validation.constraints.Size;

public record UpdateTaskRequest(
		@Size(max = 200)
		String title,
		String description,
		TaskPriority priority,
		LocalDate dueDate) {
}
