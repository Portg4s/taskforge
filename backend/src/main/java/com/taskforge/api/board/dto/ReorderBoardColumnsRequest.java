package com.taskforge.api.board.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;

public record ReorderBoardColumnsRequest(
		@NotEmpty
		List<UUID> columnIds) {
}
