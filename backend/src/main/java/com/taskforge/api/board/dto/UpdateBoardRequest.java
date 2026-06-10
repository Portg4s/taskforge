package com.taskforge.api.board.dto;

import jakarta.validation.constraints.Size;

public record UpdateBoardRequest(
		@Size(max = 160)
		String name) {
}
