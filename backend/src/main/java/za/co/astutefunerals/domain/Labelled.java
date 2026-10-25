package za.co.astutefunerals.domain;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** An enum with a human-readable label, exposed to the frontend via /api/meta. */
public interface Labelled {

	String name();

	String label();

	record Option(String value, String label) {
	}

	static <E extends Enum<E> & Labelled> List<Option> options(Class<E> type) {
		return Arrays.stream(type.getEnumConstants()).map(e -> new Option(e.name(), e.label())).toList();
	}

	static <E extends Enum<E>> Optional<E> parse(Class<E> type, String value) {
		return Arrays.stream(type.getEnumConstants()).filter(e -> e.name().equals(value)).findFirst();
	}

}
