package za.co.astutefunerals.web;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Every API error is returned as {@code {"error": "...", "errors": {field: message}}}. */
@RestControllerAdvice
public class ApiExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

	public record ErrorBody(String error, Map<String, String> errors) {
	}

	@ExceptionHandler(ValidationException.class)
	ResponseEntity<ErrorBody> validation(ValidationException ex) {
		return ResponseEntity.status(422).body(new ErrorBody(ex.getMessage(), ex.getErrors()));
	}

	/** Unknown URL: JSON for the API, otherwise the React app (which shows its own 404 page). */
	@ExceptionHandler(NoResourceFoundException.class)
	ResponseEntity<?> notFound(NoResourceFoundException ex, HttpServletRequest request) throws IOException {
		if (request.getRequestURI().startsWith("/api/")) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorBody("Not found.", Map.of()));
		}
		Resource index = new ClassPathResource("static/index.html");
		if (!index.exists()) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).contentType(MediaType.TEXT_PLAIN).body("Not found");
		}
		return ResponseEntity.status(HttpStatus.NOT_FOUND)
			.contentType(MediaType.TEXT_HTML)
			.body(index.getContentAsString(StandardCharsets.UTF_8));
	}

	@ExceptionHandler(ResponseStatusException.class)
	ResponseEntity<ErrorBody> status(ResponseStatusException ex) {
		return ResponseEntity.status(ex.getStatusCode()).body(new ErrorBody(ex.getReason(), Map.of()));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<ErrorBody> unreadable(HttpMessageNotReadableException ex) {
		return ResponseEntity.badRequest().body(new ErrorBody("Invalid request.", Map.of()));
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ErrorBody> unexpected(Exception ex) {
		log.error("Unhandled error", ex);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
			.body(new ErrorBody("Something went wrong. Please try again.", Map.of()));
	}

}
