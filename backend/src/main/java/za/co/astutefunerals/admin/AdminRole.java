package za.co.astutefunerals.admin;

import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import za.co.astutefunerals.domain.Labelled;

public enum AdminRole implements Labelled {

	/** Manages other admin users, plus everything an admin can do. */
	SUPER_ADMIN("Super admin"),

	/** Manages applications and replies to messages. */
	ADMIN("Admin");

	private final String label;

	AdminRole(String label) {
		this.label = label;
	}

	@Override
	public String label() {
		return label;
	}

	public List<GrantedAuthority> authorities() {
		return this == SUPER_ADMIN
				? List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"), new SimpleGrantedAuthority("ROLE_ADMIN"))
				: List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
	}

}
