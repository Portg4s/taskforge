package com.taskforge.api.board.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BoardResponse(
		UUID id,
		String name,
		UUID projectId,
		List<BoardColumnResponse> columns,
		Instant createdAt,
		Instant updatedAt) {
}
