package za.co.astutefunerals.config;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Small in-memory limiter for login and the public forms, keyed by client IP. */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

	private record Limit(int max, Duration window) {
	}

	private record Window(int count, long resetAt) {
	}

	private static final Map<String, Limit> LIMITS = Map.of("/api/admin/login", new Limit(8, Duration.ofMinutes(15)),
			"/api/applications", new Limit(10, Duration.ofHours(1)), "/api/contact",
			new Limit(5, Duration.ofHours(1)),
			// Google bills address lookups: enough for a busy office capturing applicants, not for abuse.
			"/api/address/suggest", new Limit(150, Duration.ofHours(1)), "/api/address/details",
			new Limit(40, Duration.ofHours(1)));

	private final Map<String, Window> hits = new ConcurrentHashMap<>();

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return !"POST".equals(request.getMethod()) || !LIMITS.containsKey(request.getRequestURI());
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String path = request.getRequestURI();
		Limit limit = LIMITS.get(path);
		long now = System.currentTimeMillis();
		Window window = hits.compute(path + "|" + request.getRemoteAddr(),
				(k, w) -> (w == null || w.resetAt() < now) ? new Window(1, now + limit.window().toMillis())
						: new Window(w.count() + 1, w.resetAt()));
		if (window.count() > limit.max()) {
			response.setStatus(429);
			response.setHeader("Retry-After", String.valueOf((window.resetAt() - now) / 1000));
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			response.getWriter()
				.write("{\"error\":\"Too many attempts. Please wait a few minutes and try again.\"}");
			return;
		}
		chain.doFilter(request, response);
	}

	@Scheduled(fixedRate = 10 * 60 * 1000)
	void evictExpired() {
		long now = System.currentTimeMillis();
		hits.values().removeIf(w -> w.resetAt() < now);
	}

}
