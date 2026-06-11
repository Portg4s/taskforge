package com.taskforge.api.task.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.taskforge.api.task.TaskPriority;

public record TaskResponse(
		UUID id,
		String title,
		String description,
		TaskPriority priority,
		LocalDate dueDate,
		int position,
		UUID boardId,
		UUID columnId,
		UUID assigneeId,
		Instant createdAt,
		Instant updatedAt) {
}
