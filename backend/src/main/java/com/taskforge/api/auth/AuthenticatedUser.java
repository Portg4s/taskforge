package com.taskforge.api.auth;

import java.util.UUID;

public record AuthenticatedUser(
		UUID id,
		String email,
		String displayName) {
}
