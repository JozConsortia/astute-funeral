package za.co.astutefunerals.admin;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import za.co.astutefunerals.messages.MailService;
import za.co.astutefunerals.web.ValidationException;

/** Sign in/out plus the signed-in admin's own profile and password. */
@RestController
public class AuthController {

	private final AuthenticationManager authenticationManager;

	private final SecurityContextRepository contextRepository;

	private final AdminUserRepository admins;

	private final PasswordEncoder encoder;

	private final MailService mail;

	private final Clock clock;

	public AuthController(AuthenticationManager authenticationManager, SecurityContextRepository contextRepository,
			AdminUserRepository admins, PasswordEncoder encoder, MailService mail, Clock clock) {
		this.authenticationManager = authenticationManager;
		this.contextRepository = contextRepository;
		this.admins = admins;
		this.encoder = encoder;
		this.mail = mail;
		this.clock = clock;
	}

	public record LoginRequest(String username, String password) {
	}

	public record PasswordRequest(String current, String next) {
	}

	public record ProfileRequest(String fullName, String email) {
	}

	public record Me(String username, String fullName, String email, AdminRole role, boolean emailEnabled) {
	}

	/** Touching the token makes Spring Security send the XSRF-TOKEN cookie. */
	@GetMapping("/api/csrf")
	public Map<String, String> csrf(CsrfToken token) {
		return Map.of("headerName", token.getHeaderName());
	}

	@PostMapping("/api/admin/login")
	@Transactional
	public Me login(@RequestBody LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
		Authentication auth;
		try {
			auth = authenticationManager.authenticate(UsernamePasswordAuthenticationToken
				.unauthenticated(req.username() == null ? "" : req.username().strip(), req.password()));
		}
		catch (DisabledException ex) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
					"This account has been deactivated. Please contact your super admin.");
		}
		catch (AuthenticationException ex) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect username or password.");
		}
		// New session id on login prevents session fixation.
		request.getSession(true);
		request.changeSessionId();
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(auth);
		SecurityContextHolder.setContext(context);
		contextRepository.saveContext(context, request, response);

		AdminUser admin = current(auth);
		admin.setLastLoginAt(Instant.now(clock));
		return me(admin);
	}

	@GetMapping("/api/admin/me")
	public Me me(Authentication auth) {
		return me(current(auth));
	}

	@PatchMapping("/api/admin/me")
	@Transactional
	public Me updateProfile(@RequestBody ProfileRequest req, Authentication auth) {
		AdminUser admin = current(auth);
		Map<String, String> errors = new LinkedHashMap<>();
		String fullName = UserController.fullName(req.fullName(), errors);
		String email = UserController.email(req.email(), errors);
		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}
		admin.setFullName(fullName);
		admin.setEmail(email);
		return me(admin);
	}

	@PostMapping("/api/admin/password")
	@Transactional
	public void changePassword(@RequestBody PasswordRequest req, Authentication auth) {
		AdminUser admin = current(auth);
		if (req.current() == null || !encoder.matches(req.current(), admin.getPasswordHash())) {
			throw new ValidationException("Your current password is incorrect.",
					Map.of("current", "Incorrect password."));
		}
		Map<String, String> errors = new LinkedHashMap<>();
		UserController.password(req.next(), "next", errors);
		if (!errors.isEmpty()) {
			throw new ValidationException("Use at least " + UserController.MIN_PASSWORD_LENGTH + " characters.", errors);
		}
		admin.setPasswordHash(encoder.encode(req.next()));
	}

	private AdminUser current(Authentication auth) {
		return admins.findByUsernameIgnoreCase(auth.getName())
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in."));
	}

	private Me me(AdminUser a) {
		return new Me(a.getUsername(), a.getFullName(), a.getEmail(), a.getRole(), mail.isEnabled());
	}

}
