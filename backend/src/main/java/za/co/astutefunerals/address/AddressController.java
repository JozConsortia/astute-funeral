package za.co.astutefunerals.address;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import za.co.astutefunerals.address.AddressSearch.Address;
import za.co.astutefunerals.address.AddressSearch.Suggestion;

/**
 * Address suggestions for the application form. POST (with the CSRF token) so other websites can't use this server
 * as a free address lookup, and rate limited per visitor in RateLimitFilter because Google bills per use.
 */
@RestController
public class AddressController {

	private static final Pattern SESSION_TOKEN = Pattern.compile("[A-Za-z0-9_-]{8,64}");

	private static final Pattern PLACE_ID = Pattern.compile("[A-Za-z0-9_-]{10,300}");

	private final AddressSearch search;

	public AddressController(AddressSearch search) {
		this.search = search;
	}

	public record SuggestRequest(String input, String session) {
	}

	public record DetailsRequest(String id, String session) {
	}

	@PostMapping("/api/address/suggest")
	public List<Suggestion> suggest(@RequestBody SuggestRequest req) {
		String input = req.input() == null ? "" : req.input().strip();
		if (input.length() < 3 || input.length() > 120 || !matches(SESSION_TOKEN, req.session())) {
			return List.of();
		}
		return search.suggest(input, req.session());
	}

	@PostMapping("/api/address/details")
	public ResponseEntity<Address> details(@RequestBody DetailsRequest req) {
		if (!matches(PLACE_ID, req.id()) || !matches(SESSION_TOKEN, req.session())) {
			return ResponseEntity.badRequest().build();
		}
		return search.details(req.id(), req.session()).map(ResponseEntity::ok)
			.orElse(ResponseEntity.notFound().build());
	}

	private static boolean matches(Pattern pattern, String value) {
		return value != null && pattern.matcher(value).matches();
	}

}
