package za.co.astutefunerals.address;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import za.co.astutefunerals.domain.Catalog;

/**
 * Address suggestions while someone types on the application form. Uses Google Places when
 * {@code app.address-search.google-api-key} is set (paid, best coverage), otherwise the free Photon service built on
 * OpenStreetMap ({@code app.address-search.photon}, on by default). Calls go from the server, so no key ever reaches
 * the browser. Any problem just means no suggestions: people can always type their address themselves.
 */
@Service
public class AddressSearch {

	/** A line in the suggestion list. {@code address} is filled in when the service already sent the full address. */
	public record Suggestion(String id, String main, String secondary, Address address) {
	}

	/** What the application form needs: the street line (with suburb), town, province and postal code. */
	public record Address(String street, String city, String province, String postalCode) {
	}

	private final AddressProvider provider;

	@Autowired
	public AddressSearch(@Value("${app.address-search.google-api-key:}") String googleKey,
			@Value("${app.address-search.google-base-url:https://places.googleapis.com}") String googleUrl,
			@Value("${app.address-search.photon:true}") boolean photon,
			@Value("${app.address-search.photon-base-url:https://photon.komoot.io}") String photonUrl) {
		this(choose(googleKey, googleUrl, photon, photonUrl));
	}

	AddressSearch(AddressProvider provider) {
		this.provider = provider;
	}

	private static AddressProvider choose(String googleKey, String googleUrl, boolean photon, String photonUrl) {
		if (googleKey != null && !googleKey.isBlank()) {
			return new GooglePlaces(googleKey.strip(), client(googleUrl));
		}
		return photon ? new PhotonSearch(client(photonUrl)) : null;
	}

	/** "google", "openstreetmap", or "" when suggestions are off. */
	public String provider() {
		return provider == null ? "" : provider.name();
	}

	public boolean isEnabled() {
		return provider != null;
	}

	public List<Suggestion> suggest(String input, String sessionToken) {
		return provider == null ? List.of() : provider.suggest(input, sessionToken);
	}

	public Optional<Address> details(String id, String sessionToken) {
		return provider == null ? Optional.empty() : provider.details(id, sessionToken);
	}

	// ---------------------------------------------------------------- shared by both services

	private static RestClient.Builder client(String baseUrl) {
		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(Duration.ofSeconds(4));
		factory.setReadTimeout(Duration.ofSeconds(6));
		return RestClient.builder().baseUrl(baseUrl).requestFactory(factory);
	}

	/** A service's province name, matched to the form's list whatever the spacing or hyphens ("KwaZulu Natal"). */
	static String province(String name) {
		String wanted = lettersOnly(name);
		return Catalog.PROVINCES.stream().filter(p -> lettersOnly(p).equals(wanted)).findFirst().orElse("");
	}

	private static String lettersOnly(String s) {
		return s == null ? "" : s.toLowerCase().replaceAll("[^a-z]", "");
	}

	static String first(Map<String, String> parts, String... keys) {
		return Stream.of(keys).map(parts::get).filter(v -> v != null && !v.isBlank()).findFirst().orElse(null);
	}

	static String join(String separator, String... values) {
		return Stream.of(values).filter(v -> v != null && !v.isBlank()).collect(Collectors.joining(separator));
	}

	static String postalCode(String value) {
		return value != null && value.strip().matches("\\d{4}") ? value.strip() : "";
	}

	static String limit(String value, int max) {
		return value.length() > max ? value.substring(0, max) : value;
	}

}
