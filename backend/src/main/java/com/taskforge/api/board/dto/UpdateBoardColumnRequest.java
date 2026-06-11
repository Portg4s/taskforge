package com.taskforge.api.board.dto;

import jakarta.validation.constraints.Size;

public record UpdateBoardColumnRequest(
		@Size(max = 120)
		String name) {
}
