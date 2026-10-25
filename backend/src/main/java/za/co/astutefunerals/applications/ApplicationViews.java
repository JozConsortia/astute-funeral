package za.co.astutefunerals.applications;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import za.co.astutefunerals.domain.ApplicationSource;
import za.co.astutefunerals.domain.ApplicationStatus;
import za.co.astutefunerals.domain.PaymentMethod;
import za.co.astutefunerals.domain.Relationship;

/** JSON shapes returned by the applications API. */
public final class ApplicationViews {

	private ApplicationViews() {
	}

	public record Created(String reference) {
	}

	public record Summary(Long id, String reference, String firstName, String lastName, String idNumber, String phone,
			String planName, int monthlyPremium, ApplicationStatus status, ApplicationSource source,
			Instant createdAt) {

		static Summary of(PolicyApplication a) {
			return new Summary(a.getId(), a.getReference(), a.getFirstName(), a.getLastName(), a.getIdNumber(),
					a.getPhone(), a.getPlanName(), a.getMonthlyPremium(), a.getStatus(), a.getSource(),
					a.getCreatedAt());
		}

	}

	public record DependantView(Relationship relationship, String firstName, String lastName, String idNumber,
			LocalDate dateOfBirth) {
	}

	public record BeneficiaryView(String firstName, String lastName, String idNumber, String relationship,
			String phone) {
	}

	public record Detail(Long id, String reference, String planId, String planName, int coverAmount,
			int monthlyPremium, String title, String firstName, String lastName, String idNumber,
			LocalDate dateOfBirth, String gender, String maritalStatus, String phone, String altPhone, String email,
			String address, String city, String province, String postalCode, List<DependantView> dependants,
			BeneficiaryView beneficiary, PaymentMethod paymentMethod, String debitDay, ApplicationStatus status,
			String notes, ApplicationSource source, String capturedBy, String lastUpdatedBy, Instant createdAt,
			Instant updatedAt) {

		static Detail of(PolicyApplication a) {
			Beneficiary b = a.getBeneficiary();
			return new Detail(a.getId(), a.getReference(), a.getPlanId(), a.getPlanName(), a.getCoverAmount(),
					a.getMonthlyPremium(), a.getTitle(), a.getFirstName(), a.getLastName(), a.getIdNumber(),
					a.getDateOfBirth(), a.getGender(), a.getMaritalStatus(), a.getPhone(), a.getAltPhone(),
					a.getEmail(), a.getAddress(), a.getCity(), a.getProvince(), a.getPostalCode(),
					a.getDependants()
						.stream()
						.map(d -> new DependantView(d.getRelationship(), d.getFirstName(), d.getLastName(),
								d.getIdNumber(), d.getDateOfBirth()))
						.toList(),
					new BeneficiaryView(b.getFirstName(), b.getLastName(), b.getIdNumber(), b.getRelationship(),
							b.getPhone()),
					a.getPaymentMethod(), a.getDebitDay(), a.getStatus(), a.getNotes(), a.getSource(),
					a.getCapturedBy(), a.getLastUpdatedBy(), a.getCreatedAt(), a.getUpdatedAt());
		}

	}

	public record PageResult<T>(List<T> rows, long total, int page, int pages) {
	}

	public record ReviewRequest(String status, String notes) {
	}

	public record PlanCount(String planName, long count) {
	}

	public record Stats(long total, java.util.Map<ApplicationStatus, Long> byStatus, long thisMonth,
			long approvedPremium, long unreadMessages, long awaitingReply, List<PlanCount> byPlan,
			List<Summary> recent) {
	}

}
