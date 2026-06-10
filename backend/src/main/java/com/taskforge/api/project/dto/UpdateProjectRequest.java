package com.taskforge.api.project.dto;

import jakarta.validation.constraints.Size;

public record UpdateProjectRequest(
		@Size(max = 160)
		String name,

		String description) {
}
