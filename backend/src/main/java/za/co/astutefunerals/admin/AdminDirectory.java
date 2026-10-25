package za.co.astutefunerals.admin;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/** Looks up the signed-in admin's display name, used to record who did what. */
@Service
public class AdminDirectory {

	private final AdminUserRepository admins;

	public AdminDirectory(AdminUserRepository admins) {
		this.admins = admins;
	}

	public String displayName(Authentication auth) {
		if (auth == null) {
			return null;
		}
		return admins.findByUsernameIgnoreCase(auth.getName()).map(AdminUser::getFullName).orElse(auth.getName());
	}

}
