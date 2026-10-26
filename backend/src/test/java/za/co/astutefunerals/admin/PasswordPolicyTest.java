package za.co.astutefunerals.admin;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

class PasswordPolicyTest {

	@Test
	void acceptsAStrongPassword() {
		assertThat(PasswordPolicy.check("Dignity#2026")).isEmpty();
	}

	@Test
	void listsEveryMissingRule() {
		assertThat(PasswordPolicy.problems("short")).containsExactly("at least 10 characters", "an uppercase letter",
				"a number", "a special character such as ! @ # or ?");
		assertThat(PasswordPolicy.check("alllowercase1!")).contains("Your password needs an uppercase letter.");
		assertThat(PasswordPolicy.check("NoNumbersHere!")).contains("Your password needs a number.");
		assertThat(PasswordPolicy.check("NoSpecial2026x")).contains("Your password needs a special character such as ! @ # or ?.");
		assertThat(PasswordPolicy.check(null)).isPresent();
	}

	@Test
	void doesNotCountSpacesAsSpecialCharacters() {
		assertThat(PasswordPolicy.check("Has Spaces 2026")).contains("Your password needs a special character such as ! @ # or ?.");
	}

	@RepeatedTest(50)
	void generatedPasswordsAlwaysPass() {
		String password = PasswordPolicy.generate();
		assertThat(password).hasSize(12);
		assertThat(PasswordPolicy.problems(password)).isEmpty();
	}

}
