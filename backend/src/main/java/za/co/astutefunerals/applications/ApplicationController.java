package za.co.astutefunerals.applications;

import java.time.LocalDate;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import za.co.astutefunerals.admin.AdminDirectory;
import za.co.astutefunerals.applications.ApplicationService.Filter;
import za.co.astutefunerals.applications.ApplicationViews.Created;
import za.co.astutefunerals.applications.ApplicationViews.Detail;
import za.co.astutefunerals.applications.ApplicationViews.PageResult;
import za.co.astutefunerals.applications.ApplicationViews.ReviewRequest;
import za.co.astutefunerals.applications.ApplicationViews.Stats;
import za.co.astutefunerals.applications.ApplicationViews.Summary;
import za.co.astutefunerals.domain.ApplicationSource;

@RestController
public class ApplicationController {

	private final ApplicationService service;

	private final AdminDirectory directory;

	public ApplicationController(ApplicationService service, AdminDirectory directory) {
		this.service = service;
		this.directory = directory;
	}

	// ---------------------------------------------------------------- public

	@PostMapping("/api/applications")
	@ResponseStatus(HttpStatus.CREATED)
	public Created apply(@RequestBody ApplicationRequest request) {
		if (request.website() != null && !request.website().isBlank()) {
			return new Created(service.newReference()); // honeypot hit: pretend success, store nothing
		}
		return new Created(service.submit(request, ApplicationSource.WEBSITE, null));
	}

	// ---------------------------------------------------------------- admin

	@GetMapping("/api/admin/stats")
	public Stats stats() {
		return service.stats();
	}

	@GetMapping("/api/admin/applications")
	public PageResult<Summary> list(@RequestParam(required = false) String q,
			@RequestParam(required = false) String status, @RequestParam(required = false) String plan,
			@RequestParam(defaultValue = "1") int page) {
		return service.search(Filter.of(q, status, plan), page);
	}

	@GetMapping("/api/admin/applications.csv")
	public ResponseEntity<String> export(@RequestParam(required = false) String q,
			@RequestParam(required = false) String status, @RequestParam(required = false) String plan) {
		String csv = CsvExporter.toCsv(service.searchAll(Filter.of(q, status, plan)));
		return ResponseEntity.ok()
			.header(HttpHeaders.CONTENT_DISPOSITION,
					"attachment; filename=\"applications-" + LocalDate.now() + ".csv\"")
			.contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
			.body(csv);
	}

	@PostMapping("/api/admin/applications")
	@ResponseStatus(HttpStatus.CREATED)
	public Created capture(@RequestBody ApplicationRequest request, Authentication auth) {
		return new Created(service.submit(request, ApplicationSource.ADMIN, directory.displayName(auth)));
	}

	@GetMapping("/api/admin/applications/{id}")
	public Detail get(@PathVariable long id) {
		return service.get(id);
	}

	@PatchMapping("/api/admin/applications/{id}")
	public void review(@PathVariable long id, @RequestBody ReviewRequest request, Authentication auth) {
		service.review(id, request, directory.displayName(auth));
	}

	@DeleteMapping("/api/admin/applications/{id}")
	public void delete(@PathVariable long id) {
		service.delete(id);
	}

}
