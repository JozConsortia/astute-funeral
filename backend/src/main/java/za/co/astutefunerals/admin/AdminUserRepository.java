package za.co.astutefunerals.admin;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {

	Optional<AdminUser> findByUsernameIgnoreCase(String username);

	boolean existsByUsernameIgnoreCase(String username);

	List<AdminUser> findAllByOrderByCreatedAtAsc();

	/** Active super admins other than {@code excludeId} - used to make sure at least one always remains. */
	@Query("""
			select count(a) from AdminUser a
			where a.id <> :excludeId
			  and (a.role = za.co.astutefunerals.admin.AdminRole.SUPER_ADMIN or a.role is null)
			  and (a.active = true or a.active is null)
			""")
	long countOtherActiveSuperAdmins(@Param("excludeId") Long excludeId);

}
