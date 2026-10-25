package za.co.astutefunerals.applications;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import za.co.astutefunerals.domain.ApplicationSource;
import za.co.astutefunerals.domain.ApplicationStatus;
import za.co.astutefunerals.domain.PaymentMethod;

/** A funeral policy application, submitted online or captured by an admin. */
@Entity
@Table(name = "applications", indexes = { @Index(columnList = "status"), @Index(columnList = "created_at") })
public class PolicyApplication {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 20)
	private String reference;

	// Plan details are copied at submission time so later price changes don't rewrite history.
	@Column(nullable = false, length = 30)
	private String planId;

	@Column(nullable = false, length = 80)
	private String planName;

	private int coverAmount;

	private int monthlyPremium;

	@Column(length = 10)
	private String title;

	@Column(nullable = false, length = 60)
	private String firstName;

	@Column(nullable = false, length = 60)
	private String lastName;

	@Column(nullable = false, length = 20)
	private String idNumber;

	@Column(nullable = false)
	private LocalDate dateOfBirth;

	@Column(length = 10)
	private String gender;

	@Column(length = 15)
	private String maritalStatus;

	@Column(nullable = false, length = 20)
	private String phone;

	@Column(length = 20)
	private String altPhone;

	@Column(length = 120)
	private String email;

	@Column(nullable = false, length = 200)
	private String address;

	@Column(nullable = false, length = 80)
	private String city;

	@Column(nullable = false, length = 40)
	private String province;

	@Column(length = 10)
	private String postalCode;

	@ElementCollection
	@CollectionTable(name = "application_dependants", joinColumns = @JoinColumn(name = "application_id"))
	@OrderColumn(name = "position")
	private List<Dependant> dependants = new ArrayList<>();

	@Embedded
	private Beneficiary beneficiary;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private PaymentMethod paymentMethod;

	@Column(length = 5)
	private String debitDay;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ApplicationStatus status = ApplicationStatus.NEW;

	@Column(nullable = false, length = 5000)
	private String notes = "";

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private ApplicationSource source;

	/** Admin who captured the application on the client's behalf (null for online applications). */
	@Column(length = 80)
	private String capturedBy;

	/** Admin who last changed the status or notes. */
	@Column(length = 80)
	private String lastUpdatedBy;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	protected PolicyApplication() {
	}

	/** Builder-style constructor used by {@link ApplicationValidator}. */
	PolicyApplication(PlanSnapshot plan, Applicant applicant, List<Dependant> dependants, Beneficiary beneficiary,
			PaymentMethod paymentMethod, String debitDay) {
		this.planId = plan.id();
		this.planName = plan.name();
		this.coverAmount = plan.cover();
		this.monthlyPremium = plan.premium();
		this.title = applicant.title();
		this.firstName = applicant.firstName();
		this.lastName = applicant.lastName();
		this.idNumber = applicant.idNumber();
		this.dateOfBirth = applicant.dateOfBirth();
		this.gender = applicant.gender();
		this.maritalStatus = applicant.maritalStatus();
		this.phone = applicant.phone();
		this.altPhone = applicant.altPhone();
		this.email = applicant.email();
		this.address = applicant.address();
		this.city = applicant.city();
		this.province = applicant.province();
		this.postalCode = applicant.postalCode();
		this.dependants = new ArrayList<>(dependants);
		this.beneficiary = beneficiary;
		this.paymentMethod = paymentMethod;
		this.debitDay = debitDay;
	}

	record PlanSnapshot(String id, String name, int cover, int premium) {
	}

	record Applicant(String title, String firstName, String lastName, String idNumber, LocalDate dateOfBirth,
			String gender, String maritalStatus, String phone, String altPhone, String email, String address,
			String city, String province, String postalCode) {
	}

	void submit(String reference, ApplicationSource source, String capturedBy, Instant now) {
		this.reference = reference;
		this.source = source;
		this.capturedBy = capturedBy;
		this.createdAt = now;
		this.updatedAt = now;
	}

	void review(ApplicationStatus status, String notes, String updatedBy, Instant now) {
		this.status = status;
		this.notes = notes;
		this.lastUpdatedBy = updatedBy;
		this.updatedAt = now;
	}

	public Long getId() {
		return id;
	}

	public String getReference() {
		return reference;
	}

	public String getPlanId() {
		return planId;
	}

	public String getPlanName() {
		return planName;
	}

	public int getCoverAmount() {
		return coverAmount;
	}

	public int getMonthlyPremium() {
		return monthlyPremium;
	}

	public String getTitle() {
		return title;
	}

	public String getFirstName() {
		return firstName;
	}

	public String getLastName() {
		return lastName;
	}

	public String getIdNumber() {
		return idNumber;
	}

	public LocalDate getDateOfBirth() {
		return dateOfBirth;
	}

	public String getGender() {
		return gender;
	}

	public String getMaritalStatus() {
		return maritalStatus;
	}

	public String getPhone() {
		return phone;
	}

	public String getAltPhone() {
		return altPhone;
	}

	public String getEmail() {
		return email;
	}

	public String getAddress() {
		return address;
	}

	public String getCity() {
		return city;
	}

	public String getProvince() {
		return province;
	}

	public String getPostalCode() {
		return postalCode;
	}

	public List<Dependant> getDependants() {
		return dependants;
	}

	public Beneficiary getBeneficiary() {
		return beneficiary;
	}

	public PaymentMethod getPaymentMethod() {
		return paymentMethod;
	}

	public String getDebitDay() {
		return debitDay;
	}

	public ApplicationStatus getStatus() {
		return status;
	}

	public String getNotes() {
		return notes;
	}

	public ApplicationSource getSource() {
		return source;
	}

	public String getCapturedBy() {
		return capturedBy;
	}

	public String getLastUpdatedBy() {
		return lastUpdatedBy;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

}
