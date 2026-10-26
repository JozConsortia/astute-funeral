package za.co.astutefunerals.admin;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "admins")
public class AdminUser {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 60)
	private String username;

	@Column(nullable = false, length = 200)
	private String passwordHash;

	// The columns below were added after the first release, so they are nullable in the
	// database; AdminSeeder fills in values for older rows on startup.
	@Column(length = 80)
	private String fullName;

	@Column(length = 120)
	private String email;

	@Enumerated(EnumType.STRING)
	@Column(length = 20)
	private AdminRole role;

	private Boolean active;

	@Column(nullable = false)
	private Instant createdAt;

	private Instant lastLoginAt;

	/** True while the user still has a temporary password that a super admin gave them. */
	private Boolean mustChangePassword;

	protected AdminUser() {
	}

	public AdminUser(String username, String passwordHash, String fullName, String email, AdminRole role,
			Instant createdAt) {
		this.username = username;
		this.passwordHash = passwordHash;
		this.fullName = fullName;
		this.email = email;
		this.role = role;
		this.active = true;
		this.createdAt = createdAt;
	}

	/** Fills in fields that older rows (created before roles existed) don't have. */
	boolean upgradeLegacyRow() {
		boolean changed = false;
		if (role == null) {
			role = AdminRole.SUPER_ADMIN;
			changed = true;
		}
		if (active == null) {
			active = true;
			changed = true;
		}
		if (fullName == null || fullName.isBlank()) {
			fullName = username;
			changed = true;
		}
		return changed;
	}

	public Long getId() {
		return id;
	}

	public String getUsername() {
		return username;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public String getFullName() {
		return fullName == null || fullName.isBlank() ? username : fullName;
	}

	public void setFullName(String fullName) {
		this.fullName = fullName;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public AdminRole getRole() {
		return role == null ? AdminRole.SUPER_ADMIN : role;
	}

	public void setRole(AdminRole role) {
		this.role = role;
	}

	public boolean isActive() {
		return active == null || active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getLastLoginAt() {
		return lastLoginAt;
	}

	public void setLastLoginAt(Instant lastLoginAt) {
		this.lastLoginAt = lastLoginAt;
	}

	public boolean isMustChangePassword() {
		return mustChangePassword != null && mustChangePassword;
	}

	public void setMustChangePassword(boolean mustChangePassword) {
		this.mustChangePassword = mustChangePassword;
	}

}
