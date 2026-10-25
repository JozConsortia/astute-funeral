package za.co.astutefunerals.applications;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import za.co.astutefunerals.domain.Relationship;

/** A family member covered on a policy (spouse, child or extended family). */
@Embeddable
public class Dependant {

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Relationship relationship;

	@Column(nullable = false, length = 60)
	private String firstName;

	@Column(nullable = false, length = 60)
	private String lastName;

	@Column(length = 20)
	private String idNumber;

	@Column(nullable = false)
	private LocalDate dateOfBirth;

	protected Dependant() {
	}

	public Dependant(Relationship relationship, String firstName, String lastName, String idNumber,
			LocalDate dateOfBirth) {
		this.relationship = relationship;
		this.firstName = firstName;
		this.lastName = lastName;
		this.idNumber = idNumber;
		this.dateOfBirth = dateOfBirth;
	}

	public Relationship getRelationship() {
		return relationship;
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

}
