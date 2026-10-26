package za.co.astutefunerals.admin;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Rules for admin passwords: at least 10 characters with an uppercase letter, a lowercase letter, a number
 * and a special character. Also generates temporary passwords that always meet them.
 */
final class PasswordPolicy {

	static final int MIN_LENGTH = 10;

	// No look-alikes (0/O, 1/l/I) so a temporary password is easy to read out over the phone.
	private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";

	private static final String LOWER = "abcdefghjkmnpqrstuvwxyz";

	private static final String DIGITS = "23456789";

	private static final String SPECIAL = "!@#$%&*?";

	private static final int GENERATED_LENGTH = 12;

	private static final SecureRandom random = new SecureRandom();

	private PasswordPolicy() {
	}

	/** The rules a password breaks, in plain words; empty when it is strong enough. */
	static List<String> problems(String password) {
		String p = password == null ? "" : password;
		List<String> problems = new ArrayList<>();
		if (p.length() < MIN_LENGTH) {
			problems.add("at least " + MIN_LENGTH + " characters");
		}
		if (p.chars().noneMatch(Character::isUpperCase)) {
			problems.add("an uppercase letter");
		}
		if (p.chars().noneMatch(Character::isLowerCase)) {
			problems.add("a lowercase letter");
		}
		if (p.chars().noneMatch(Character::isDigit)) {
			problems.add("a number");
		}
		if (p.chars().noneMatch(c -> !Character.isLetterOrDigit(c) && !Character.isWhitespace(c))) {
			problems.add("a special character such as ! @ # or ?");
		}
		return problems;
	}

	/** A message such as "Your password needs a number and a special character ...", or empty when it passes. */
	static Optional<String> check(String password) {
		List<String> problems = problems(password);
		if (problems.isEmpty()) {
			return Optional.empty();
		}
		String list = problems.size() == 1 ? problems.get(0)
				: String.join(", ", problems.subList(0, problems.size() - 1)) + " and " + problems.getLast();
		return Optional.of("Your password needs " + list + ".");
	}

	/** A random temporary password with at least one character from every group. */
	static String generate() {
		List<Character> chars = new ArrayList<>();
		for (String group : List.of(UPPER, LOWER, DIGITS, SPECIAL)) {
			chars.add(pick(group));
		}
		String all = UPPER + LOWER + DIGITS + SPECIAL;
		while (chars.size() < GENERATED_LENGTH) {
			chars.add(pick(all));
		}
		Collections.shuffle(chars, random);
		StringBuilder out = new StringBuilder();
		chars.forEach(out::append);
		return out.toString();
	}

	private static char pick(String group) {
		return group.charAt(random.nextInt(group.length()));
	}

}
