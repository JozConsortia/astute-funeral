package za.co.astutefunerals.applications;

import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import za.co.astutefunerals.applications.ApplicationRequest.BeneficiaryRequest;
import za.co.astutefunerals.applications.ApplicationRequest.DependantRequest;
import za.co.astutefunerals.config.AppProperties;
import za.co.astutefunerals.config.AppProperties.Plan;
import za.co.astutefunerals.domain.Catalog;
import za.co.astutefunerals.domain.Labelled;
import za.co.astutefunerals.domain.PaymentMethod;
import za.co.astutefunerals.domain.Relationship;
import za.co.astutefunerals.web.ValidationException;

/** Validates and normalises application form data into a {@link PolicyApplication}. */
@Component
public class ApplicationValidator {

	private static final Pattern NAME = Pattern.compile("^\\p{L}[\\p{L}' .-]{0,59}$");

	private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");

	private static final Pattern PHONE_CHARS = Pattern.compile("^\\+?[0-9 ()-]+$");

	private static final int MAX_DEPENDANTS = 20;

	private final AppProperties properties;

	private final Clock clock;

	public ApplicationValidator(AppProperties properties, Clock clock) {
		this.properties = properties;
		this.clock = clock;
	}

	public PolicyApplication validate(ApplicationRequest req) {
		Map<String, String> errors = new LinkedHashMap<>();
		LocalDate today = LocalDate.now(clock);

		Plan plan = properties.plan(clean(req.plan(), 30)).orElse(null);
		if (plan == null) {
			errors.put("plan", "Please choose a plan.");
		}

		String firstName = name(req.firstName(), "firstName", "Enter a valid first name.", errors);
		String lastName = name(req.lastName(), "lastName", "Enter a valid surname.", errors);
		String idNumber = idNumber(req.idNumber(), "idNumber", true, errors);
		LocalDate dateOfBirth = dateOfBirth(req.dateOfBirth(), "dateOfBirth", true, today, errors);
		if (dateOfBirth != null && age(dateOfBirth, today) < 18) {
			errors.put("dateOfBirth", "The main member must be at least 18 years old.");
		}

		String title = Catalog.TITLES.contains(req.title()) ? req.title() : "";
		String gender = Catalog.contains(Catalog.GENDERS, req.gender()) ? req.gender() : "";
		if (gender.isEmpty()) {
			errors.put("gender", "Please select a gender.");
		}
		String maritalStatus = Catalog.contains(Catalog.MARITAL_STATUSES, req.maritalStatus()) ? req.maritalStatus()
				: "";

		String phone = clean(req.phone(), 20);
		if (!isValidPhone(phone)) {
			errors.put("phone", "Enter a valid cellphone number.");
		}
		String altPhone = clean(req.altPhone(), 20);
		if (!altPhone.isEmpty() && !isValidPhone(altPhone)) {
			errors.put("altPhone", "Enter a valid phone number.");
		}
		String email = clean(req.email(), 120).toLowerCase();
		if (!email.isEmpty() && !EMAIL.matcher(email).matches()) {
			errors.put("email", "Enter a valid email address.");
		}
		String address = clean(req.address(), 200);
		if (address.length() < 5) {
			errors.put("address", "Enter your street address.");
		}
		String city = clean(req.city(), 80);
		if (city.length() < 2) {
			errors.put("city", "Enter your town or city.");
		}
		String province = clean(req.province(), 40);
		if (!Catalog.PROVINCES.contains(province)) {
			errors.put("province", "Select your province.");
		}
		String postalCode = clean(req.postalCode(), 10);
		if (!postalCode.isEmpty() && !postalCode.matches("\\d{4}")) {
			errors.put("postalCode", "Postal codes have 4 digits.");
		}

		PaymentMethod paymentMethod = Labelled.parse(PaymentMethod.class, req.paymentMethod()).orElse(null);
		if (paymentMethod == null) {
			errors.put("paymentMethod", "Choose how you would like to pay.");
		}
		String debitDay = clean(req.debitDay(), 5);
		if (paymentMethod == PaymentMethod.EFT) {
			debitDay = "";
		}
		else if (!Catalog.contains(Catalog.DEBIT_DAYS, debitDay)) {
			errors.put("debitDay", "Choose a deduction date.");
		}

		List<Dependant> dependants = dependants(req.dependants(), today, errors);
		if (plan != null) {
			checkAllowance(plan, dependants, errors);
		}

		Beneficiary beneficiary = beneficiary(req.beneficiary(), errors);

		if (!Boolean.TRUE.equals(req.consent())) {
			errors.put("consent", "Consent is required to process the application.");
		}
		if (!Boolean.TRUE.equals(req.declaration())) {
			errors.put("declaration", "Please confirm the declaration.");
		}

		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}

		return new PolicyApplication(
				new PolicyApplication.PlanSnapshot(plan.id(), plan.name(), plan.cover(), plan.premium()),
				new PolicyApplication.Applicant(title, firstName, lastName, idNumber, dateOfBirth, gender,
						maritalStatus, phone, altPhone, email, address, city, province, postalCode),
				dependants, beneficiary, paymentMethod, debitDay);
	}

	private List<Dependant> dependants(List<DependantRequest> input, LocalDate today, Map<String, String> errors) {
		List<Dependant> result = new ArrayList<>();
		if (input == null) {
			return result;
		}
		for (int i = 0; i < Math.min(input.size(), MAX_DEPENDANTS); i++) {
			DependantRequest d = Objects.requireNonNullElseGet(input.get(i),
					() -> new DependantRequest(null, null, null, null, null));
			String prefix = "dependants." + i + ".";
			Relationship relationship = Labelled.parse(Relationship.class, d.relationship()).orElse(null);
			if (relationship == null) {
				errors.put(prefix + "relationship", "Select a relationship.");
			}
			// Children may not have an ID number yet, so only their date of birth is required.
			boolean requireId = relationship != Relationship.CHILD;
			result.add(new Dependant(relationship, name(d.firstName(), prefix + "firstName", "Enter a valid first name.", errors),
					name(d.lastName(), prefix + "lastName", "Enter a valid surname.", errors),
					idNumber(d.idNumber(), prefix + "idNumber", requireId, errors),
					dateOfBirth(d.dateOfBirth(), prefix + "dateOfBirth", true, today, errors)));
		}
		return result;
	}

	private static void checkAllowance(Plan plan, List<Dependant> dependants, Map<String, String> errors) {
		long spouses = dependants.stream().filter(d -> d.getRelationship() == Relationship.SPOUSE).count();
		long children = dependants.stream().filter(d -> d.getRelationship() == Relationship.CHILD).count();
		long extended = dependants.stream()
			.filter(d -> d.getRelationship() != null && d.getRelationship().isExtended())
			.count();
		if (spouses > (plan.spouse() ? 1 : 0)) {
			errors.put("dependants", plan.spouse() ? "Only one spouse can be added."
					: "The " + plan.name() + " does not cover a spouse.");
		}
		else if (children > plan.maxChildren()) {
			errors.put("dependants", "The " + plan.name() + " covers up to " + plan.maxChildren() + " children.");
		}
		else if (extended > plan.maxExtended()) {
			errors.put("dependants",
					"The " + plan.name() + " covers up to " + plan.maxExtended() + " extended family members.");
		}
	}

	private static Beneficiary beneficiary(BeneficiaryRequest input, Map<String, String> errors) {
		BeneficiaryRequest b = Objects.requireNonNullElseGet(input,
				() -> new BeneficiaryRequest(null, null, null, null, null));
		String firstName = name(b.firstName(), "beneficiary.firstName", "Enter a valid first name.", errors);
		String lastName = name(b.lastName(), "beneficiary.lastName", "Enter a valid surname.", errors);
		String idNumber = idNumber(b.idNumber(), "beneficiary.idNumber", true, errors);
		String relationship = clean(b.relationship(), 40);
		if (relationship.length() < 2) {
			errors.put("beneficiary.relationship", "Enter their relationship to you.");
		}
		String phone = clean(b.phone(), 20);
		if (!isValidPhone(phone)) {
			errors.put("beneficiary.phone", "Enter a valid phone number.");
		}
		return new Beneficiary(firstName, lastName, idNumber, relationship, phone);
	}

	// ------------------------------------------------------------------ field helpers

	private static String name(String value, String key, String message, Map<String, String> errors) {
		String name = clean(value, 60);
		if (!NAME.matcher(name).matches()) {
			errors.put(key, message);
		}
		return name;
	}

	private static String idNumber(String value, String key, boolean required, Map<String, String> errors) {
		String id = clean(value, 20).replace(" ", "").toUpperCase();
		if ((required || !id.isEmpty()) && !isValidIdNumber(id)) {
			errors.put(key, "Enter a valid SA ID or passport number.");
		}
		return id;
	}

	private static LocalDate dateOfBirth(String value, String key, boolean required, LocalDate today,
			Map<String, String> errors) {
		String raw = clean(value, 10);
		if (raw.isEmpty() && !required) {
			return null;
		}
		try {
			LocalDate date = LocalDate.parse(raw);
			if (!date.isAfter(today) && age(date, today) <= 120) {
				return date;
			}
		}
		catch (DateTimeParseException ex) {
			// fall through to the error below
		}
		errors.put(key, "Enter a valid date of birth.");
		return null;
	}

	private static int age(LocalDate dateOfBirth, LocalDate today) {
		return Period.between(dateOfBirth, today).getYears();
	}

	public static String clean(String value, int max) {
		if (value == null) {
			return "";
		}
		String s = value.strip().replaceAll("\\s+", " ");
		return s.length() > max ? s.substring(0, max) : s;
	}

	/** Accepts a 13-digit SA ID number (Luhn check digit) or an alphanumeric passport number. */
	public static boolean isValidIdNumber(String value) {
		if (value.matches("\\d{13}")) {
			return luhn(value);
		}
		return value.matches("(?i)[A-Z0-9]{6,20}") && !value.matches("\\d+");
	}

	public static boolean isValidPhone(String value) {
		int digits = value.replaceAll("\\D", "").length();
		return PHONE_CHARS.matcher(value).matches() && digits >= 9 && digits <= 15;
	}

	public static boolean isValidEmail(String value) {
		return EMAIL.matcher(value).matches() && value.length() <= 120;
	}

	private static boolean luhn(String digits) {
		int sum = 0;
		for (int i = 0; i < digits.length(); i++) {
			int d = digits.charAt(digits.length() - 1 - i) - '0';
			if (i % 2 == 1) {
				d *= 2;
				if (d > 9) {
					d -= 9;
				}
			}
			sum += d;
		}
		return sum % 10 == 0;
	}

}
