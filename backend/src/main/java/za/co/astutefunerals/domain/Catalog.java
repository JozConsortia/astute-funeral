package za.co.astutefunerals.domain;

import java.util.List;

import za.co.astutefunerals.domain.Labelled.Option;

/** Fixed option lists used by the application form. */
public final class Catalog {

	public static final List<String> PROVINCES = List.of("Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
			"Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape");

	public static final List<String> TITLES = List.of("Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Rev");

	public static final List<Option> GENDERS = List.of(new Option("female", "Female"), new Option("male", "Male"),
			new Option("other", "Other"));

	public static final List<Option> MARITAL_STATUSES = List.of(new Option("single", "Single"),
			new Option("married", "Married"), new Option("cohabiting", "Living together"),
			new Option("divorced", "Divorced"), new Option("widowed", "Widowed"));

	public static final List<Option> DEBIT_DAYS = List.of(new Option("1", "1st of the month"),
			new Option("7", "7th of the month"), new Option("15", "15th of the month"),
			new Option("20", "20th of the month"), new Option("25", "25th of the month"),
			new Option("last", "Last day of the month"));

	private Catalog() {
	}

	public static boolean contains(List<Option> options, String value) {
		return options.stream().anyMatch(o -> o.value().equals(value));
	}

}
