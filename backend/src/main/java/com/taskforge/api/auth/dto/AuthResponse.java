package com.taskforge.api.auth.dto;

public record AuthResponse(
		String token,
		UserResponse user) {
}
