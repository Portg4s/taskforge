package com.taskforge.api.common.error;

import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(MethodArgumentNotValidException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	ApiErrorResponse handleValidationException(
			MethodArgumentNotValidException exception,
			HttpServletRequest request) {
		String message = exception.getBindingResult().getFieldErrors().stream()
				.map(error -> error.getField() + ": " + error.getDefaultMessage())
				.collect(Collectors.joining(", "));

		return buildErrorResponse(
				HttpStatus.BAD_REQUEST,
				message.isBlank() ? "Validation failed" : message,
				request);
	}

	@ExceptionHandler(ResponseStatusException.class)
	ResponseEntity<ApiErrorResponse> handleResponseStatusException(
			ResponseStatusException exception,
			HttpServletRequest request) {
		HttpStatusCode status = exception.getStatusCode();
		String message = exception.getReason() == null ? "Request failed" : exception.getReason();

		return ResponseEntity.status(status)
				.body(buildErrorResponse(status, message, request));
	}

	@ExceptionHandler(Exception.class)
	@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
	ApiErrorResponse handleUnexpectedException(Exception exception, HttpServletRequest request) {
		log.error("Unexpected API error on {}", request.getRequestURI(), exception);

		return buildErrorResponse(
				HttpStatus.INTERNAL_SERVER_ERROR,
				"An unexpected error occurred",
				request);
	}

	private ApiErrorResponse buildErrorResponse(
			HttpStatusCode status,
			String message,
			HttpServletRequest request) {
		return new ApiErrorResponse(
				java.time.Instant.now(),
				status.value(),
				reasonPhrase(status),
				message,
				request.getRequestURI());
	}

	private String reasonPhrase(HttpStatusCode status) {
		if (status instanceof HttpStatus httpStatus) {
			return httpStatus.getReasonPhrase();
		}

		return "HTTP " + status.value();
	}
}
