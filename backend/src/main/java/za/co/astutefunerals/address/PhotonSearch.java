package za.co.astutefunerals.address;

import static za.co.astutefunerals.address.AddressSearch.join;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import za.co.astutefunerals.address.AddressSearch.Address;
import za.co.astutefunerals.address.AddressSearch.Suggestion;

/**
 * Photon (photon.komoot.io), a free address search over OpenStreetMap data: no account, no key, fair use only.
 * <p>
 * OpenStreetMap knows most South African street names, township streets and sections included, but few house or
 * stand numbers. So when a result has no number, the number the person already typed is kept ("9552 Nku Street").
 * Ward names, which the map data often uses for areas ("Tshwane Ward 6"), are left out of addresses.
 */
class PhotonSearch implements AddressProvider {

	private static final Logger log = LoggerFactory.getLogger(PhotonSearch.class);

	/** South Africa's bounding box (west, south, east, north); results are also checked for country code ZA. */
	private static final String SOUTH_AFRICA = "16.3,-35.0,33.0,-22.0";

	/** House numbers, streets and suburbs / township sections. Not whole towns, provinces or landmarks. */
	private static final Set<String> USEFUL_TYPES = Set.of("house", "street", "locality", "district");

	private static final Pattern WARD = Pattern.compile("(?i)\\bward\\s*\\d+");

	private static final Pattern COUNCIL = Pattern.compile("(?i)municipality");

	private static final Pattern TYPED_NUMBER = Pattern.compile("^\\s*(\\d{1,6}[A-Za-z]?)(?=[\\s,]|$)");

	private final RestClient http;

	PhotonSearch(RestClient.Builder builder) {
		this.http = builder.defaultHeader("User-Agent", "address-suggest/1.0").build();
	}

	@Override
	public String name() {
		return "openstreetmap";
	}

	@Override
	public List<Suggestion> suggest(String input, String sessionToken) {
		try {
			FeatureCollection response = http.get()
				.uri(b -> b.path("/api")
					.queryParam("q", input)
					.queryParam("limit", 10)
					.queryParam("lang", "en")
					.queryParam("bbox", SOUTH_AFRICA)
					.build())
				.retrieve()
				.body(FeatureCollection.class);
			if (response == null || response.features() == null) {
				return List.of();
			}
			Matcher typed = TYPED_NUMBER.matcher(input);
			String typedNumber = typed.find() ? typed.group(1) : null;
			Map<String, Suggestion> unique = new LinkedHashMap<>();
			for (Feature feature : response.features()) {
				Properties p = feature.properties();
				if (p == null || !"ZA".equalsIgnoreCase(p.countryCode()) || !USEFUL_TYPES.contains(p.type())) {
					continue;
				}
				Suggestion s = toSuggestion(p, typedNumber);
				if (s != null) {
					unique.putIfAbsent((s.main() + "|" + s.secondary()).toLowerCase(), s);
				}
				if (unique.size() == 5) {
					break;
				}
			}
			return List.copyOf(unique.values());
		}
		catch (RestClientException ex) {
			log.warn("Photon address suggestions unavailable: {}", ex.getMessage());
			return List.of();
		}
	}

	/** Not needed: every Photon suggestion already carries its full address. */
	@Override
	public Optional<Address> details(String id, String sessionToken) {
		return Optional.empty();
	}

	static Suggestion toSuggestion(Properties p, String typedNumber) {
		String place = "house".equals(p.type()) ? firstText(p.street(), p.name()) : p.name();
		if (place == null) {
			return null;
		}
		String number = firstText(p.houseNumber(), typedNumber);
		String streetLine = join(" ", number, place);
		String city = firstText(town(p.city()), notWard(p.district()), notWard(p.locality()), town(p.county()));
		String area = Stream.of(p.locality(), p.district())
			.map(PhotonSearch::notWard)
			.filter(a -> a != null && !a.equalsIgnoreCase(place) && !a.equalsIgnoreCase(city))
			.findFirst()
			.orElse(null);
		String province = AddressSearch.province(p.state());
		Address address = new Address(AddressSearch.limit(join(", ", streetLine, area), 200),
				city == null ? "" : city, province, AddressSearch.postalCode(p.postcode()));
		return new Suggestion(p.osmType() + p.osmId(), streetLine, join(", ", area, city, province), address);
	}

	/** Councils aren't what people write: "Emfuleni Local Municipality" is skipped, "City of Cape Town" -> "Cape Town". */
	private static String town(String name) {
		if (name == null || COUNCIL.matcher(name).find()) {
			return null;
		}
		return name.startsWith("City of ") ? name.substring("City of ".length()) : name;
	}

	private static String notWard(String area) {
		return area == null || WARD.matcher(area).find() ? null : area;
	}

	private static String firstText(String... values) {
		return Stream.of(values).filter(v -> v != null && !v.isBlank()).map(String::strip).findFirst().orElse(null);
	}

	// ---------------------------------------------------------------- Photon's GeoJSON (only the fields we use)

	@JsonIgnoreProperties(ignoreUnknown = true)
	record FeatureCollection(List<Feature> features) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Feature(Properties properties) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Properties(@JsonProperty("osm_type") String osmType, @JsonProperty("osm_id") Long osmId, String type,
			String name, @JsonProperty("housenumber") String houseNumber, String street, String locality,
			String district, String city, String county, String state, String postcode,
			@JsonProperty("countrycode") String countryCode) {
	}

}
