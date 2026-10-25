package za.co.astutefunerals.applications;

import java.util.List;

/**
 * Raw application form data. Everything is a String so that bad input becomes a friendly
 * field error from {@link ApplicationValidator} instead of a JSON parsing failure.
 */
public record ApplicationRequest(String plan, String title, String firstName, String lastName, String idNumber,
		String dateOfBirth, String gender, String maritalStatus, String phone, String altPhone, String email,
		String address, String city, String province, String postalCode, List<DependantRequest> dependants,
		BeneficiaryRequest beneficiary, String paymentMethod, String debitDay, Boolean consent, Boolean declaration,
		/** Honeypot field - hidden from people, filled in by bots. */
		String website) {

	public record DependantRequest(String relationship, String firstName, String lastName, String idNumber,
			String dateOfBirth) {
	}

	public record BeneficiaryRequest(String firstName, String lastName, String idNumber, String relationship,
			String phone) {
	}

}
