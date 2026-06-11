package com.taskforge.api.board.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBoardColumnRequest(
		@NotBlank
		@Size(max = 120)
		String name) {
}
