package za.co.astutefunerals.admin;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import za.co.astutefunerals.config.AppProperties;

/**
 * Creates the first super admin from configuration when the database has none, and upgrades
 * accounts created before roles existed.
 */
@Component
class AdminSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

	private final AdminUserRepository admins;

	private final PasswordEncoder encoder;

	private final AppProperties properties;

	private final Clock clock;

	AdminSeeder(AdminUserRepository admins, PasswordEncoder encoder, AppProperties properties, Clock clock) {
		this.admins = admins;
		this.encoder = encoder;
		this.properties = properties;
		this.clock = clock;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (admins.count() > 0) {
			admins.findAll().forEach(AdminUser::upgradeLegacyRow);
			return;
		}
		String username = properties.admin().username();
		String password = properties.admin().password();
		if (password == null || password.isBlank()) {
			byte[] bytes = new byte[9];
			new SecureRandom().nextBytes(bytes);
			password = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
			log.warn("No ADMIN_PASSWORD set - generated super admin login: username '{}' password '{}'. "
					+ "Sign in at /admin and change it under Settings.", username, password);
		}
		admins.save(new AdminUser(username, encoder.encode(password), "Super Administrator", null,
				AdminRole.SUPER_ADMIN, Instant.now(clock)));
		log.info("Created super admin account '{}'", username);
	}

}
