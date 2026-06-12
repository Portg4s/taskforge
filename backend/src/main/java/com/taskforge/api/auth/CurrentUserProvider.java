package com.taskforge.api.auth;

import com.taskforge.api.user.User;
import com.taskforge.api.user.UserRepository;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserProvider {

	private final UserRepository userRepository;

	public CurrentUserProvider(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	public User getCurrentUser() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser principal)) {
			throw new AuthenticationCredentialsNotFoundException("Authenticated user required");
		}

		return userRepository.findById(principal.id())
				.orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Authenticated user not found"));
	}
}
