package za.co.astutefunerals.admin;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AdminUserDetailsService implements UserDetailsService {

	private final AdminUserRepository admins;

	public AdminUserDetailsService(AdminUserRepository admins) {
		this.admins = admins;
	}

	@Override
	public UserDetails loadUserByUsername(String username) {
		return admins.findByUsernameIgnoreCase(username)
			.map(a -> User.withUsername(a.getUsername())
				.password(a.getPasswordHash())
				.authorities(a.getRole().authorities())
				.disabled(!a.isActive())
				.build())
			.orElseThrow(() -> new UsernameNotFoundException(username));
	}

}
