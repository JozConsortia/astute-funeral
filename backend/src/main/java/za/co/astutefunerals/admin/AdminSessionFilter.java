package za.co.astutefunerals.admin;

import java.io.IOException;
import java.util.HashSet;
import java.util.Optional;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Re-checks the signed-in admin against the database on every admin request, so that a
 * deactivated or deleted user is signed out immediately and role changes apply at once.
 */
public class AdminSessionFilter extends OncePerRequestFilter {

	private final AdminUserRepository admins;

	private final SecurityContextRepository contextRepository;

	public AdminSessionFilter(AdminUserRepository admins, SecurityContextRepository contextRepository) {
		this.admins = admins;
		this.contextRepository = contextRepository;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return !request.getRequestURI().startsWith("/api/admin/");
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
			chain.doFilter(request, response);
			return;
		}

		Optional<AdminUser> admin = admins.findByUsernameIgnoreCase(auth.getName());
		if (admin.isEmpty() || !admin.get().isActive()) {
			HttpSession session = request.getSession(false);
			if (session != null) {
				session.invalidate();
			}
			SecurityContextHolder.clearContext();
			response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			response.getWriter()
				.write("{\"error\":\"Your account is no longer active. Please contact your super admin.\",\"errors\":{}}");
			return;
		}

		var current = admin.get().getRole().authorities();
		if (!new HashSet<>(current).equals(new HashSet<>(auth.getAuthorities()))) {
			// Role changed since sign-in: refresh the session's permissions.
			SecurityContext context = SecurityContextHolder.createEmptyContext();
			context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(auth.getPrincipal(), null, current));
			SecurityContextHolder.setContext(context);
			contextRepository.saveContext(context, request, response);
		}
		chain.doFilter(request, response);
	}

}
