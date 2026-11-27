package za.co.astutefunerals.address;

import static za.co.astutefunerals.address.AddressSearch.first;
import static za.co.astutefunerals.address.AddressSearch.join;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import za.co.astutefunerals.address.AddressSearch.Address;
import za.co.astutefunerals.address.AddressSearch.Suggestion;

/**
 * Google Places API (New). Paid per use; the browser sends one session token for all the lookups of one address and
 * a new one after a pick, so Google bills the typing and the final pick together as one session.
 */
class GooglePlaces implements AddressProvider {

	private static final Logger log = LoggerFactory.getLogger(GooglePlaces.class);

	/** Street addresses and buildings, plus bare streets for rural or new addresses Google doesn't know by number. */
	private static final List<String> ADDRESS_TYPES = List.of("street_address", "premise", "subpremise", "route");

	private final RestClient http;

	GooglePlaces(String apiKey, RestClient.Builder builder) {
		this.http = builder.defaultHeader("X-Goog-Api-Key", apiKey).build();
	}

	@Override
	public String name() {
		return "google";
	}

	@Override
	public List<Suggestion> suggest(String input, String sessionToken) {
		try {
			AutocompleteResponse response = http.post()
				.uri("/v1/places:autocomplete")
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("input", input, "includedRegionCodes", List.of("za"), "includedPrimaryTypes",
						ADDRESS_TYPES, "sessionToken", sessionToken))
				.retrieve()
				.body(AutocompleteResponse.class);
			if (response == null || response.suggestions() == null) {
				return List.of();
			}
			return response.suggestions()
				.stream()
				.map(AutocompleteItem::placePrediction)
				.filter(p -> p != null && p.placeId() != null)
				.map(GooglePlaces::toSuggestion)
				.limit(5)
				.toList();
		}
		catch (RestClientException ex) {
			log.warn("Google address suggestions unavailable: {}", ex.getMessage());
			return List.of();
		}
	}

	@Override
	public Optional<Address> details(String placeId, String sessionToken) {
		try {
			Place place = http.get()
				.uri(b -> b.path("/v1/places/{id}").queryParam("sessionToken", sessionToken).build(placeId))
				.header("X-Goog-FieldMask", "addressComponents,formattedAddress")
				.retrieve()
				.body(Place.class);
			return Optional.ofNullable(place).map(GooglePlaces::toAddress);
		}
		catch (RestClientException ex) {
			log.warn("Google address details unavailable: {}", ex.getMessage());
			return Optional.empty();
		}
	}

	private static Suggestion toSuggestion(Prediction p) {
		String full = p.text() == null ? "" : Objects.toString(p.text().text(), "");
		Structured s = p.structuredFormat();
		String main = s != null && s.mainText() != null ? s.mainText().text() : full;
		String secondary = s != null && s.secondaryText() != null ? s.secondaryText().text() : "";
		// No address yet: Google sends it on the details call, which also closes the billing session.
		return new Suggestion(p.placeId(), Objects.toString(main, full), Objects.toString(secondary, ""), null);
	}

	static Address toAddress(Place place) {
		Map<String, String> parts = new HashMap<>();
		if (place.addressComponents() != null) {
			for (Component c : place.addressComponents()) {
				if (c.types() != null && c.longText() != null) {
					c.types().forEach(type -> parts.putIfAbsent(type, c.longText().strip()));
				}
			}
		}
		String street = join(" ", parts.get("street_number"), parts.get("route"));
		if (street.isEmpty() && place.formattedAddress() != null) {
			street = place.formattedAddress().split(",")[0].strip();
		}
		String building = parts.get("premise");
		if (building != null && street.toLowerCase().contains(building.toLowerCase())) {
			building = null;
		}
		String suburb = first(parts, "sublocality_level_1", "sublocality", "neighborhood");
		String city = first(parts, "locality", "administrative_area_level_2");
		if (city == null) {
			city = suburb;
		}
		if (suburb != null && suburb.equalsIgnoreCase(city)) {
			suburb = null;
		}
		return new Address(AddressSearch.limit(join(", ", building, street, suburb), 200), Objects.toString(city, ""),
				AddressSearch.province(parts.get("administrative_area_level_1")),
				AddressSearch.postalCode(parts.get("postal_code")));
	}

	// ---------------------------------------------------------------- Google's JSON (only the fields we use)

	@JsonIgnoreProperties(ignoreUnknown = true)
	record AutocompleteResponse(List<AutocompleteItem> suggestions) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record AutocompleteItem(Prediction placePrediction) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Prediction(String placeId, Text text, Structured structuredFormat) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Structured(Text mainText, Text secondaryText) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Text(String text) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Place(List<Component> addressComponents, String formattedAddress) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Component(String longText, String shortText, List<String> types) {
	}

}
