package com.taskforge.api.board.dto;

import java.time.Instant;
import java.util.UUID;

public record BoardColumnResponse(
		UUID id,
		String name,
		int position,
		Instant createdAt,
		Instant updatedAt) {
}
