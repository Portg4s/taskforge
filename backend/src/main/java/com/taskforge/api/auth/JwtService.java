package com.taskforge.api.auth;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskforge.api.user.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

	private static final String HMAC_ALGORITHM = "HmacSHA256";
	private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
	private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

	private final ObjectMapper objectMapper;
	private final byte[] secret;
	private final Duration expiration;

	public JwtService(
			@Value("${taskforge.jwt.secret}") String secret,
			@Value("${taskforge.jwt.expiration}") Duration expiration) {
		this.objectMapper = new ObjectMapper();
		this.secret = secret.getBytes(StandardCharsets.UTF_8);
		this.expiration = expiration;
	}

	public String generateToken(User user) {
		Instant now = Instant.now();
		Map<String, Object> header = Map.of(
				"alg", "HS256",
				"typ", "JWT");
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("sub", user.getId().toString());
		payload.put("email", user.getEmail());
		payload.put("iat", now.getEpochSecond());
		payload.put("exp", now.plus(expiration).getEpochSecond());

		String headerPart = encodeJson(header);
		String payloadPart = encodeJson(payload);
		String unsignedToken = headerPart + "." + payloadPart;

		return unsignedToken + "." + sign(unsignedToken);
	}

	public Optional<UUID> extractUserId(String token) {
		try {
			String[] parts = token.split("\\.");
			if (parts.length != 3) {
				return Optional.empty();
			}

			String unsignedToken = parts[0] + "." + parts[1];
			if (!constantTimeEquals(sign(unsignedToken), parts[2])) {
				return Optional.empty();
			}

			Map<String, Object> payload = objectMapper.readValue(
					BASE64_URL_DECODER.decode(parts[1]),
					new TypeReference<>() {
					});
			if (isExpired(payload.get("exp"))) {
				return Optional.empty();
			}

			Object subject = payload.get("sub");
			return subject instanceof String value ? Optional.of(UUID.fromString(value)) : Optional.empty();
		} catch (RuntimeException | java.io.IOException exception) {
			return Optional.empty();
		}
	}

	private String encodeJson(Map<String, Object> value) {
		try {
			return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
		} catch (java.io.IOException exception) {
			throw new IllegalStateException("Unable to create JWT", exception);
		}
	}

	private String sign(String unsignedToken) {
		try {
			Mac mac = Mac.getInstance(HMAC_ALGORITHM);
			mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
			return BASE64_URL_ENCODER.encodeToString(mac.doFinal(unsignedToken.getBytes(StandardCharsets.UTF_8)));
		} catch (java.security.GeneralSecurityException exception) {
			throw new IllegalStateException("Unable to sign JWT", exception);
		}
	}

	private boolean constantTimeEquals(String expected, String actual) {
		return java.security.MessageDigest.isEqual(
				expected.getBytes(StandardCharsets.UTF_8),
				actual.getBytes(StandardCharsets.UTF_8));
	}

	private boolean isExpired(Object exp) {
		if (exp instanceof Number number) {
			return Instant.now().getEpochSecond() >= number.longValue();
		}

		return true;
	}
}
