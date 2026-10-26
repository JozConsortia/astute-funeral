package za.co.astutefunerals.applications;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import za.co.astutefunerals.applications.ApplicationRequest.BeneficiaryRequest;
import za.co.astutefunerals.applications.ApplicationService.Filter;
import za.co.astutefunerals.domain.ApplicationSource;
import za.co.astutefunerals.domain.ApplicationStatus;

/** The filters behind the overview tiles: status, and "this month" for the This month tile. */
@SpringBootTest(properties = { "spring.datasource.url=jdbc:h2:mem:filters", "app.admin.password=test-password" })
class ApplicationFilterTest {

	@Autowired
	ApplicationService service;

	@Autowired
	JdbcTemplate jdbc;

	private static ApplicationRequest request(String firstName) {
		return new ApplicationRequest("single", "Mr", firstName, "Mokoena", "8501015800088", "1985-01-01", "male",
				"married", "082 123 4567", "", "thabo@example.com", "12 Oak Street", "Soweto", "Gauteng", "1804", List.of(),
				new BeneficiaryRequest("Lerato", "Mokoena", "8703030800081", "Wife", "083 555 1234"), "DEBIT_ORDER", "25",
				true, true, null);
	}

	@Test
	void thisMonthOnlyIncludesApplicationsFromTheCurrentMonth() {
		String recent = service.submit(request("Recent"), ApplicationSource.WEBSITE, null);
		String old = service.submit(request("Older"), ApplicationSource.WEBSITE, null);
		jdbc.update("update applications set created_at = ? where reference = ?",
				Timestamp.from(Instant.now().minus(400, ChronoUnit.DAYS)), old);

		List<String> thisMonth = service.searchAll(Filter.of(null, null, null, "month"))
			.stream()
			.map(ApplicationViews.Detail::reference)
			.toList();
		List<String> anyTime = service.searchAll(Filter.of(null, null, null, null))
			.stream()
			.map(ApplicationViews.Detail::reference)
			.toList();

		assertThat(thisMonth).contains(recent).doesNotContain(old);
		assertThat(anyTime).contains(recent, old);
		assertThat(service.stats().thisMonth()).isEqualTo(thisMonth.size());
	}

	@Test
	void statusFilterMatchesTheStatusTiles() {
		service.submit(request("Status"), ApplicationSource.WEBSITE, null);

		assertThat(service.search(Filter.of(null, "NEW", null, null), 1).total())
			.isEqualTo(service.stats().byStatus().get(ApplicationStatus.NEW));
		assertThat(service.search(Filter.of(null, "DECLINED", null, null), 1).total())
			.isEqualTo(service.stats().byStatus().get(ApplicationStatus.DECLINED));
	}

}
