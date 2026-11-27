package za.co.astutefunerals.applications;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import za.co.astutefunerals.applications.ApplicationViews.Detail;
import za.co.astutefunerals.applications.ApplicationViews.PageResult;
import za.co.astutefunerals.applications.ApplicationViews.PlanCount;
import za.co.astutefunerals.applications.ApplicationViews.ReviewRequest;
import za.co.astutefunerals.applications.ApplicationViews.Stats;
import za.co.astutefunerals.applications.ApplicationViews.Summary;
import za.co.astutefunerals.domain.ApplicationSource;
import za.co.astutefunerals.domain.ApplicationStatus;
import za.co.astutefunerals.domain.Labelled;
import za.co.astutefunerals.messages.ContactMessageRepository;
import za.co.astutefunerals.messages.StaffAlerts;

@Service
public class ApplicationService {

	private static final int PAGE_SIZE = 15;

	private static final String REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

	private static final DateTimeFormatter REFERENCE_DATE = DateTimeFormatter.ofPattern("yyMMdd");

	private final PolicyApplicationRepository applications;

	private final ContactMessageRepository messages;

	private final ApplicationValidator validator;

	private final Clock clock;

	private final SecureRandom random = new SecureRandom();

	private final StaffAlerts alerts;

	public ApplicationService(PolicyApplicationRepository applications, ContactMessageRepository messages,
			ApplicationValidator validator, Clock clock, StaffAlerts alerts) {
		this.applications = applications;
		this.messages = messages;
		this.validator = validator;
		this.clock = clock;
		this.alerts = alerts;
	}

	@Transactional
	public String submit(ApplicationRequest request, ApplicationSource source, String capturedBy) {
		PolicyApplication application = validator.validate(request);
		application.submit(newReference(), source, capturedBy, Instant.now(clock));
		PolicyApplication saved = applications.save(application);
		// Staff capturing an applicant already know about it; only online applications need an alert.
		if (source == ApplicationSource.WEBSITE) {
			alerts.newApplication(saved.getReference(), saved.getFirstName() + " " + saved.getLastName(),
					saved.getPhone(), saved.getPlanName(), saved.getMonthlyPremium());
		}
		return saved.getReference();
	}

	/** A reference such as AF-261025-DXUC: date plus 4 unambiguous random characters. */
	public String newReference() {
		String reference;
		do {
			StringBuilder suffix = new StringBuilder();
			for (int i = 0; i < 4; i++) {
				suffix.append(REFERENCE_ALPHABET.charAt(random.nextInt(REFERENCE_ALPHABET.length())));
			}
			reference = "AF-" + LocalDate.now(clock).format(REFERENCE_DATE) + "-" + suffix;
		}
		while (applications.existsByReference(reference));
		return reference;
	}

	@Transactional(readOnly = true)
	public PageResult<Summary> search(Filter filter, int page) {
		int current = Math.max(1, page);
		Page<PolicyApplication> result = applications.search(filter.like(), filter.status(), filter.planId(),
				since(filter), PageRequest.of(current - 1, PAGE_SIZE, Sort.by(Sort.Direction.DESC, "createdAt")));
		return new PageResult<>(result.map(Summary::of).getContent(), result.getTotalElements(), current,
				Math.max(1, result.getTotalPages()));
	}

	@Transactional(readOnly = true)
	public List<Detail> searchAll(Filter filter) {
		return applications.searchAll(filter.like(), filter.status(), filter.planId(), since(filter))
			.stream()
			.map(Detail::of)
			.toList();
	}

	@Transactional(readOnly = true)
	public Detail get(long id) {
		return Detail.of(find(id));
	}

	@Transactional
	public void review(long id, ReviewRequest request, String updatedBy) {
		PolicyApplication application = find(id);
		ApplicationStatus status = Labelled.parse(ApplicationStatus.class, request.status())
			.orElse(application.getStatus());
		String notes = request.notes() == null ? application.getNotes()
				: request.notes().substring(0, Math.min(request.notes().length(), 5000));
		application.review(status, notes, updatedBy, Instant.now(clock));
	}

	@Transactional
	public void delete(long id) {
		applications.delete(find(id));
	}

	@Transactional(readOnly = true)
	public Stats stats() {
		Map<ApplicationStatus, Long> byStatus = new EnumMap<>(ApplicationStatus.class);
		for (ApplicationStatus s : ApplicationStatus.values()) {
			byStatus.put(s, 0L);
		}
		for (Object[] row : applications.countByStatus()) {
			byStatus.put((ApplicationStatus) row[0], (Long) row[1]);
		}
		return new Stats(byStatus.values().stream().mapToLong(Long::longValue).sum(), byStatus,
				applications.countByCreatedAtGreaterThanEqual(monthStart()),
				applications.sumPremiumByStatus(ApplicationStatus.APPROVED), messages.countByReadFalse(),
				messages.countAwaitingReply(),
				applications.countByPlan().stream().map(r -> new PlanCount((String) r[0], (Long) r[1])).toList(),
				applications.findTop6ByOrderByCreatedAtDesc().stream().map(Summary::of).toList());
	}

	/** Start of the current month in the business time zone; "This month" on the overview and in the list. */
	private Instant monthStart() {
		return LocalDate.now(clock).withDayOfMonth(1).atStartOfDay(clock.getZone()).toInstant();
	}

	private Instant since(Filter filter) {
		return filter.thisMonth() ? monthStart() : Instant.EPOCH;
	}

	private PolicyApplication find(long id) {
		return applications.findById(id)
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found."));
	}

	/** Search filters from the admin list. Blank values mean "any"; period "month" means this month only. */
	public record Filter(String q, ApplicationStatus status, String planId, boolean thisMonth) {

		public static Filter of(String q, String status, String plan, String period) {
			String query = ApplicationValidator.clean(q, 80);
			return new Filter(query.isEmpty() ? null : query.toLowerCase(),
					Labelled.parse(ApplicationStatus.class, status).orElse(null),
					Optional.ofNullable(plan).filter(p -> !p.isBlank()).orElse(null), "month".equals(period));
		}

		String like() {
			return q == null ? null : "%" + q + "%";
		}

	}

}
