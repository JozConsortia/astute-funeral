package za.co.astutefunerals.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import za.co.astutefunerals.address.AddressSearch;
import za.co.astutefunerals.admin.AdminRole;
import za.co.astutefunerals.config.AppProperties;
import za.co.astutefunerals.config.AppProperties.Plan;
import za.co.astutefunerals.domain.ApplicationStatus;
import za.co.astutefunerals.domain.Catalog;
import za.co.astutefunerals.domain.Labelled;
import za.co.astutefunerals.domain.Labelled.Option;
import za.co.astutefunerals.domain.PaymentMethod;
import za.co.astutefunerals.domain.Relationship;
import za.co.astutefunerals.messages.ReplyChannel;

/** Plans and option lists for the frontend, so the backend stays the single source of truth. */
@RestController
public class MetaController {

	private final AppProperties properties;

	private final AddressSearch addressSearch;

	public MetaController(AppProperties properties, AddressSearch addressSearch) {
		this.properties = properties;
		this.addressSearch = addressSearch;
	}

	/** addressSearch: where address suggestions come from ("google", "openstreetmap"), or "" when they are off. */
	public record Meta(List<Plan> plans, List<String> provinces, List<String> titles, List<Option> genders,
			List<Option> maritalStatuses, List<Option> relationships, List<Option> paymentMethods,
			List<Option> debitDays, List<Option> statuses, List<Option> adminRoles, List<Option> replyChannels,
			String addressSearch) {
	}

	@GetMapping("/api/meta")
	public Meta meta() {
		return new Meta(properties.plans(), Catalog.PROVINCES, Catalog.TITLES, Catalog.GENDERS,
				Catalog.MARITAL_STATUSES, Labelled.options(Relationship.class), Labelled.options(PaymentMethod.class),
				Catalog.DEBIT_DAYS, Labelled.options(ApplicationStatus.class), Labelled.options(AdminRole.class),
				Labelled.options(ReplyChannel.class), addressSearch.provider());
	}

}
