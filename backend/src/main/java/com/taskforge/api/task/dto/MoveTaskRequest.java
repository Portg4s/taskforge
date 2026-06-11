package com.taskforge.api.task.dto;

import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record MoveTaskRequest(
		@NotNull
		UUID columnId,
		@NotNull
		@Min(0)
		Integer position) {
}
