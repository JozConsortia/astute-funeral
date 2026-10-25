package za.co.astutefunerals.applications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import org.junit.jupiter.api.Test;

import za.co.astutefunerals.applications.ApplicationRequest.BeneficiaryRequest;
import za.co.astutefunerals.applications.ApplicationRequest.DependantRequest;
import za.co.astutefunerals.config.AppProperties;
import za.co.astutefunerals.config.AppProperties.Plan;
import za.co.astutefunerals.domain.Relationship;
import za.co.astutefunerals.web.ValidationException;

class ApplicationValidatorTest {

	private static final String VALID_ID = "8501015800088";

	private static final String SPOUSE_ID = "8703030800081";

	private final AppProperties properties = new AppProperties("http://localhost", null,
			List.of(new Plan("single", "Single Plan", 10000, 95, false, 0, 0, false, "", List.of()),
					new Plan("family", "Family Plan", 15000, 185, true, 5, 0, true, "", List.of())));

	private final ApplicationValidator validator = new ApplicationValidator(properties,
			Clock.fixed(Instant.parse("2026-10-25T10:00:00Z"), ZoneId.of("Africa/Johannesburg")));

	private static ApplicationRequest request(String plan, String idNumber, List<DependantRequest> dependants,
			Boolean consent) {
		return new ApplicationRequest(plan, "Mr", "Thabo", "Mokoena", idNumber, "1985-01-01", "male", "married",
				"082 123 4567", "", "thabo@example.com", "12 Oak Street", "Soweto", "Gauteng", "1804", dependants,
				new BeneficiaryRequest("Lerato", "Mokoena", SPOUSE_ID, "Wife", "083 555 1234"), "DEBIT_ORDER", "25",
				consent, true, null);
	}

	@Test
	void acceptsValidFamilyApplication() {
		PolicyApplication app = validator.validate(request("family", VALID_ID,
				List.of(new DependantRequest("SPOUSE", "Lerato", "Mokoena", SPOUSE_ID, "1987-03-03"),
						new DependantRequest("CHILD", "Neo", "Mokoena", "", "2015-06-10")),
				true));

		assertThat(app.getPlanName()).isEqualTo("Family Plan");
		assertThat(app.getMonthlyPremium()).isEqualTo(185);
		assertThat(app.getDependants()).extracting(Dependant::getRelationship)
			.containsExactly(Relationship.SPOUSE, Relationship.CHILD);
	}

	@Test
	void reportsFieldErrors() {
		assertThatThrownBy(() -> validator.validate(request("single", "1234567890123",
				List.of(new DependantRequest("SPOUSE", "Lerato", "Mokoena", SPOUSE_ID, "1987-03-03")), false)))
			.isInstanceOfSatisfying(ValidationException.class,
					ex -> assertThat(ex.getErrors()).containsOnlyKeys("idNumber", "dependants", "consent"));
	}

	@Test
	void checksSouthAfricanIdNumbers() {
		assertThat(ApplicationValidator.isValidIdNumber(VALID_ID)).isTrue();
		assertThat(ApplicationValidator.isValidIdNumber("8501015800089")).isFalse();
		assertThat(ApplicationValidator.isValidIdNumber("A1234567")).isTrue();
		assertThat(ApplicationValidator.isValidIdNumber("12345")).isFalse();
	}

}
