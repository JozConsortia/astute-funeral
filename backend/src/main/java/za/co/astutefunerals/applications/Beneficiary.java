package za.co.astutefunerals.applications;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** The person who receives the payout when a claim is made. */
@Embeddable
public class Beneficiary {

	@Column(name = "beneficiary_first_name", nullable = false, length = 60)
	private String firstName;

	@Column(name = "beneficiary_last_name", nullable = false, length = 60)
	private String lastName;

	@Column(name = "beneficiary_id_number", nullable = false, length = 20)
	private String idNumber;

	@Column(name = "beneficiary_relationship", nullable = false, length = 40)
	private String relationship;

	@Column(name = "beneficiary_phone", nullable = false, length = 20)
	private String phone;

	protected Beneficiary() {
	}

	public Beneficiary(String firstName, String lastName, String idNumber, String relationship, String phone) {
		this.firstName = firstName;
		this.lastName = lastName;
		this.idNumber = idNumber;
		this.relationship = relationship;
		this.phone = phone;
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

	public String getRelationship() {
		return relationship;
	}

	public String getPhone() {
		return phone;
	}

}
