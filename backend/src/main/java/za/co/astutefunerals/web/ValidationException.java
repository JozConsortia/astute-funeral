package za.co.astutefunerals.web;

import java.util.Map;

/**
 * Thrown when submitted data is invalid. {@code errors} maps a field path (for example
 * {@code dependants.0.firstName}) to a message the frontend shows next to that field.
 */
public class ValidationException extends RuntimeException {

	private final transient Map<String, String> errors;

	public ValidationException(Map<String, String> errors) {
		this("Please correct the highlighted fields.", errors);
	}

	public ValidationException(String message, Map<String, String> errors) {
		super(message);
		this.errors = Map.copyOf(errors);
	}

	public Map<String, String> getErrors() {
		return errors;
	}

}
