package com.taskforge.api.board.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBoardRequest(
		@NotBlank
		@Size(max = 160)
		String name) {
}
