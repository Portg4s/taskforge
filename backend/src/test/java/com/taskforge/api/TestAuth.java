package com.taskforge.api;

import java.util.UUID;

import com.taskforge.api.auth.JwtService;
import com.taskforge.api.user.User;
import com.taskforge.api.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

public final class TestAuth {

	private TestAuth() {
	}

	public static String bearerToken(
			UserRepository userRepository,
			PasswordEncoder passwordEncoder,
			JwtService jwtService) {
		String email = "test-" + UUID.randomUUID() + "@taskforge.local";
		User user = userRepository.save(new User(email, "Test User", passwordEncoder.encode("password-123")));

		return "Bearer " + jwtService.generateToken(user);
	}
}
