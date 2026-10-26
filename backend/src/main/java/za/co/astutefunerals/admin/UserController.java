package za.co.astutefunerals.admin;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static za.co.astutefunerals.applications.ApplicationValidator.clean;
import static za.co.astutefunerals.applications.ApplicationValidator.isValidEmail;

import za.co.astutefunerals.domain.Labelled;
import za.co.astutefunerals.web.ValidationException;

/** User management - super admins only (enforced in SecurityConfig). */
@RestController
@RequestMapping("/api/admin/users")
public class UserController {

	private final AdminUserRepository admins;

	private final PasswordEncoder encoder;

	private final Clock clock;

	public UserController(AdminUserRepository admins, PasswordEncoder encoder, Clock clock) {
		this.admins = admins;
		this.encoder = encoder;
		this.clock = clock;
	}

	public record UserView(Long id, String username, String fullName, String email, AdminRole role, boolean active,
			boolean mustChangePassword, Instant createdAt, Instant lastLoginAt) {

		static UserView of(AdminUser a) {
			return new UserView(a.getId(), a.getUsername(), a.getFullName(), a.getEmail(), a.getRole(), a.isActive(),
					a.isMustChangePassword(), a.getCreatedAt(), a.getLastLoginAt());
		}

	}

	public record CreateUserRequest(String fullName, String username, String email, String role) {
	}

	public record UpdateUserRequest(String fullName, String email, String role, Boolean active) {
	}

	/** Shown to the super admin once; only its hash is stored. */
	public record TemporaryPassword(UserView user, String temporaryPassword) {
	}

	@GetMapping
	public List<UserView> list() {
		return admins.findAllByOrderByCreatedAtAsc().stream().map(UserView::of).toList();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@Transactional
	public TemporaryPassword create(@RequestBody CreateUserRequest req) {
		Map<String, String> errors = new LinkedHashMap<>();
		String fullName = fullName(req.fullName(), errors);
		String email = email(req.email(), errors);
		AdminRole role = role(req.role(), errors);
		String username = clean(req.username(), 40).toLowerCase();
		if (!username.matches("[a-z0-9._-]{3,40}")) {
			errors.put("username", "Use 3-40 letters, numbers, dots, dashes or underscores.");
		}
		else if (admins.existsByUsernameIgnoreCase(username)) {
			errors.put("username", "That username is already taken.");
		}
		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}
		String temporary = PasswordPolicy.generate();
		AdminUser user = new AdminUser(username, encoder.encode(temporary), fullName, email, role, Instant.now(clock));
		user.setMustChangePassword(true);
		return new TemporaryPassword(UserView.of(admins.save(user)), temporary);
	}

	@PatchMapping("/{id}")
	@Transactional
	public UserView update(@PathVariable long id, @RequestBody UpdateUserRequest req, Authentication auth) {
		AdminUser user = find(id);
		boolean isSelf = user.getUsername().equalsIgnoreCase(auth.getName());
		Map<String, String> errors = new LinkedHashMap<>();
		String fullName = fullName(req.fullName(), errors);
		String email = email(req.email(), errors);
		AdminRole role = role(req.role(), errors);
		boolean active = req.active() == null || req.active();
		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}

		boolean losesSuperAdmin = user.getRole() == AdminRole.SUPER_ADMIN && user.isActive()
				&& (role != AdminRole.SUPER_ADMIN || !active);
		if (isSelf && losesSuperAdmin) {
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"You can't remove your own super admin access or deactivate yourself.");
		}
		if (losesSuperAdmin && admins.countOtherActiveSuperAdmins(user.getId()) == 0) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "There must always be at least one active super admin.");
		}

		user.setFullName(fullName);
		user.setEmail(email);
		user.setRole(role);
		user.setActive(active);
		return UserView.of(user);
	}

	/** Gives the user a new temporary password, which they must replace when they next sign in. */
	@PostMapping("/{id}/password")
	@Transactional
	public TemporaryPassword resetPassword(@PathVariable long id) {
		AdminUser user = find(id);
		String temporary = PasswordPolicy.generate();
		user.setPasswordHash(encoder.encode(temporary));
		user.setMustChangePassword(true);
		return new TemporaryPassword(UserView.of(user), temporary);
	}

	@DeleteMapping("/{id}")
	@Transactional
	public void delete(@PathVariable long id, Authentication auth) {
		AdminUser user = find(id);
		if (user.getUsername().equalsIgnoreCase(auth.getName())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "You can't delete your own account.");
		}
		if (user.getRole() == AdminRole.SUPER_ADMIN && user.isActive()
				&& admins.countOtherActiveSuperAdmins(user.getId()) == 0) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "There must always be at least one active super admin.");
		}
		admins.delete(user);
	}

	// ------------------------------------------------------------------ helpers (shared with AuthController)

	private AdminUser find(long id) {
		return admins.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
	}

	static String fullName(String value, Map<String, String> errors) {
		String name = clean(value, 80);
		if (name.length() < 2) {
			errors.put("fullName", "Enter the person's full name.");
		}
		return name;
	}

	static String email(String value, Map<String, String> errors) {
		String email = clean(value, 120).toLowerCase();
		if (!email.isEmpty() && !isValidEmail(email)) {
			errors.put("email", "Enter a valid email address.");
		}
		return email.isEmpty() ? null : email;
	}

	private static AdminRole role(String value, Map<String, String> errors) {
		AdminRole role = Labelled.parse(AdminRole.class, value).orElse(null);
		if (role == null) {
			errors.put("role", "Choose a role.");
		}
		return role;
	}

}
