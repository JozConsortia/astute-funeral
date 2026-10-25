package za.co.astutefunerals.applications;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import za.co.astutefunerals.domain.ApplicationStatus;

public interface PolicyApplicationRepository extends JpaRepository<PolicyApplication, Long> {

	String SEARCH = """
			select a from PolicyApplication a
			where (:status is null or a.status = :status)
			  and (:planId is null or a.planId = :planId)
			  and (:q is null
			       or lower(concat(a.firstName, ' ', a.lastName)) like :q
			       or lower(a.idNumber) like :q
			       or lower(a.reference) like :q
			       or a.phone like :q
			       or lower(a.email) like :q)
			""";

	/** {@code q} must already be lower-cased and wrapped in % wildcards (or null). */
	@Query(SEARCH)
	Page<PolicyApplication> search(@Param("q") String q, @Param("status") ApplicationStatus status,
			@Param("planId") String planId, Pageable pageable);

	@Query(SEARCH + " order by a.createdAt desc")
	List<PolicyApplication> searchAll(@Param("q") String q, @Param("status") ApplicationStatus status,
			@Param("planId") String planId);

	boolean existsByReference(String reference);

	List<PolicyApplication> findTop6ByOrderByCreatedAtDesc();

	long countByCreatedAtGreaterThanEqual(Instant since);

	@Query("select a.status, count(a) from PolicyApplication a group by a.status")
	List<Object[]> countByStatus();

	@Query("select coalesce(sum(a.monthlyPremium), 0) from PolicyApplication a where a.status = :status")
	long sumPremiumByStatus(@Param("status") ApplicationStatus status);

	@Query("select a.planName, count(a) from PolicyApplication a group by a.planName order by count(a) desc")
	List<Object[]> countByPlan();

}
