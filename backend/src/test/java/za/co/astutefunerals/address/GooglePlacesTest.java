package za.co.astutefunerals.address;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import za.co.astutefunerals.address.AddressSearch.Address;
import za.co.astutefunerals.address.AddressSearch.Suggestion;

/** Requests and answers follow Google's Places API (New) documentation; a stand-in plays Google. */
class GooglePlacesTest {

	private static final String GOOGLE = "https://places.googleapis.com";

	private static final String SESSION = "3f1c2a4e-9b7d-4c1e-8a2f-5d6e7f8a9b0c";

	private final RestClient.Builder builder = RestClient.builder().baseUrl(GOOGLE);

	private final MockRestServiceServer google = MockRestServiceServer.bindTo(builder).build();

	private final GooglePlaces search = new GooglePlaces("test-key", builder);

	@Test
	void suggestsSouthAfricanAddressesInOneBillingSession() {
		google.expect(requestTo(GOOGLE + "/v1/places:autocomplete"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(header("X-Goog-Api-Key", "test-key"))
			.andExpect(jsonPath("$.input").value("4 Sister Baum"))
			.andExpect(jsonPath("$.includedRegionCodes[0]").value("za"))
			.andExpect(jsonPath("$.sessionToken").value(SESSION))
			.andRespond(withSuccess("""
					{"suggestions": [{"placePrediction": {
					  "place": "places/ChIJ_danville_4",
					  "placeId": "ChIJ_danville_4",
					  "text": {"text": "4 Sister Baumgarten Dr, Danville, Pretoria, South Africa"},
					  "structuredFormat": {
					    "mainText": {"text": "4 Sister Baumgarten Dr"},
					    "secondaryText": {"text": "Danville, Pretoria, South Africa"}},
					  "types": ["street_address"]}}]}
					""", MediaType.APPLICATION_JSON));

		assertThat(search.suggest("4 Sister Baum", SESSION))
			.containsExactly(new Suggestion("ChIJ_danville_4", "4 Sister Baumgarten Dr", "Danville, Pretoria, South Africa", null));
		google.verify();
	}

	@Test
	void fillsInStreetSuburbTownProvinceAndPostalCode() {
		google.expect(requestTo(GOOGLE + "/v1/places/ChIJ_danville_4?sessionToken=" + SESSION))
			.andExpect(method(HttpMethod.GET))
			.andExpect(header("X-Goog-FieldMask", "addressComponents,formattedAddress"))
			.andRespond(withSuccess("""
					{"formattedAddress": "4 Sister Baumgarten Dr, Danville, Pretoria, 0183, South Africa",
					 "addressComponents": [
					  {"longText": "4", "shortText": "4", "types": ["street_number"]},
					  {"longText": "Sister Baumgarten Drive", "shortText": "Sister Baumgarten Dr", "types": ["route"]},
					  {"longText": "Danville", "shortText": "Danville", "types": ["sublocality_level_1", "sublocality", "political"]},
					  {"longText": "Pretoria", "shortText": "Pretoria", "types": ["locality", "political"]},
					  {"longText": "Gauteng", "shortText": "GP", "types": ["administrative_area_level_1", "political"]},
					  {"longText": "South Africa", "shortText": "ZA", "types": ["country", "political"]},
					  {"longText": "0183", "shortText": "0183", "types": ["postal_code"]}]}
					""", MediaType.APPLICATION_JSON));

		assertThat(search.details("ChIJ_danville_4", SESSION))
			.contains(new Address("4 Sister Baumgarten Drive, Danville", "Pretoria", "Gauteng", "0183"));
		google.verify();
	}

	@Test
	void matchesProvinceNamesWhateverTheSpelling() {
		assertThat(AddressSearch.province("KwaZulu Natal")).isEqualTo("KwaZulu-Natal");
		assertThat(AddressSearch.province("north west")).isEqualTo("North West");
		assertThat(AddressSearch.province("Somewhere else")).isEmpty();
	}

	@Test
	void googleTroubleMeansNoSuggestionsNotAnError() {
		google.expect(requestTo(GOOGLE + "/v1/places:autocomplete")).andRespond(withServerError());

		assertThat(search.suggest("12 Oak", SESSION)).isEmpty();
	}


}
