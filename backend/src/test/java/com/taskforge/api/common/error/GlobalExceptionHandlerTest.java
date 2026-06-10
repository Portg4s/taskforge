package com.taskforge.api.common.error;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class GlobalExceptionHandlerTest {

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
		validator.afterPropertiesSet();

		mockMvc = MockMvcBuilders.standaloneSetup(new ValidationTestController())
				.setControllerAdvice(new GlobalExceptionHandler())
				.setValidator(validator)
				.build();
	}

	@Test
	void validationErrorsReturnApiErrorResponse() throws Exception {
		mockMvc.perform(post("/api/test-validation")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.error").value("Bad Request"))
				.andExpect(jsonPath("$.message", containsString("name")))
				.andExpect(jsonPath("$.path").value("/api/test-validation"));
	}

	@Test
	void unexpectedErrorsReturnGenericApiErrorResponse() throws Exception {
		mockMvc.perform(get("/api/test-unexpected-error"))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.status").value(500))
				.andExpect(jsonPath("$.error").value("Internal Server Error"))
				.andExpect(jsonPath("$.message").value("An unexpected error occurred"))
				.andExpect(jsonPath("$.message", not(containsString("database password leaked"))))
				.andExpect(jsonPath("$.path").value("/api/test-unexpected-error"));
	}

	@RestController
	private static class ValidationTestController {

		@PostMapping("/api/test-validation")
		void validate(@Valid @RequestBody ValidationRequest request) {
		}

		@GetMapping("/api/test-unexpected-error")
		void fail() {
			throw new IllegalStateException("database password leaked");
		}
	}

	private record ValidationRequest(@NotBlank String name) {
	}
}
