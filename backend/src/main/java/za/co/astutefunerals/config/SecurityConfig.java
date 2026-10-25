package za.co.astutefunerals.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;

import za.co.astutefunerals.admin.AdminSessionFilter;
import za.co.astutefunerals.admin.AdminUserRepository;

@Configuration
public class SecurityConfig {

	private static final String CSP = String.join("; ", "default-src 'self'", "script-src 'self'",
			"style-src 'self' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com",
			"img-src 'self' data:", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'self'",
			"form-action 'self'");

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, AdminUserRepository admins) throws Exception {
		http
			// Cookie-based CSRF for single-page apps: the XSRF-TOKEN cookie is echoed back
			// in the X-XSRF-TOKEN header by the React client.
			.csrf(csrf -> csrf.spa())
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.POST, "/api/admin/login").permitAll()
				.requestMatchers("/api/admin/users", "/api/admin/users/**").hasRole("SUPER_ADMIN")
				.requestMatchers("/api/admin/**").hasRole("ADMIN")
				.anyRequest().permitAll())
			.addFilterBefore(new AdminSessionFilter(admins, securityContextRepository()), AuthorizationFilter.class)
			.exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
			.securityContext(sc -> sc.securityContextRepository(securityContextRepository()))
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable)
			.logout(logout -> logout.logoutUrl("/api/admin/logout")
				.logoutSuccessHandler((req, res, auth) -> res.setStatus(HttpStatus.OK.value())))
			.headers(h -> h.contentSecurityPolicy(c -> c.policyDirectives(CSP))
				.frameOptions(f -> f.deny())
				.referrerPolicy(r -> r.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)));
		return http.build();
	}

	@Bean
	SecurityContextRepository securityContextRepository() {
		return new HttpSessionSecurityContextRepository();
	}

	@Bean
	AuthenticationManager authenticationManager(UserDetailsService users, PasswordEncoder encoder) {
		DaoAuthenticationProvider provider = new DaoAuthenticationProvider(users);
		provider.setPasswordEncoder(encoder);
		return new ProviderManager(provider);
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	Clock clock() {
		return Clock.system(ZoneId.of("Africa/Johannesburg"));
	}

}
