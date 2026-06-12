package com.taskforge.api.auth;

import com.taskforge.api.auth.dto.AuthResponse;
import com.taskforge.api.auth.dto.LoginRequest;
import com.taskforge.api.auth.dto.RegisterRequest;
import com.taskforge.api.auth.dto.UserResponse;
import com.taskforge.api.user.User;
import com.taskforge.api.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final CurrentUserProvider currentUserProvider;

	public AuthService(
			UserRepository userRepository,
			PasswordEncoder passwordEncoder,
			JwtService jwtService,
			CurrentUserProvider currentUserProvider) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.currentUserProvider = currentUserProvider;
	}

	@Transactional
	public AuthResponse register(RegisterRequest request) {
		String email = normalizeEmail(request.email());
		if (userRepository.existsByEmail(email)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
		}

		User user = userRepository.save(new User(
				email,
				request.displayName().trim(),
				passwordEncoder.encode(request.password())));

		return toAuthResponse(user);
	}

	@Transactional(readOnly = true)
	public AuthResponse login(LoginRequest request) {
		String email = normalizeEmail(request.email());
		User user = userRepository.findByEmail(email)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

		if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
		}

		return toAuthResponse(user);
	}

	@Transactional(readOnly = true)
	public UserResponse currentUser() {
		return toUserResponse(currentUserProvider.getCurrentUser());
	}

	private AuthResponse toAuthResponse(User user) {
		return new AuthResponse(jwtService.generateToken(user), toUserResponse(user));
	}

	private UserResponse toUserResponse(User user) {
		return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getCreatedAt());
	}

	private String normalizeEmail(String email) {
		return email.trim().toLowerCase();
	}
}
