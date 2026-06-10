package com.taskforge.api.auth;

import com.taskforge.api.user.User;
import com.taskforge.api.user.UserRepository;
import org.springframework.stereotype.Component;

@Component
public class DevUserProvider {

	private static final String DEV_USER_EMAIL = "dev@taskforge.local";
	private static final String DEV_USER_DISPLAY_NAME = "TaskForge Dev User";

	private final UserRepository userRepository;

	public DevUserProvider(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	// Temporary until JWT authentication is implemented.
	public User getCurrentUser() {
		return userRepository.findByEmail(DEV_USER_EMAIL)
				.orElseGet(() -> userRepository.save(new User(DEV_USER_EMAIL, DEV_USER_DISPLAY_NAME, null)));
	}
}
