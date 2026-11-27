package za.co.astutefunerals.address;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import za.co.astutefunerals.address.AddressSearch.Address;
import za.co.astutefunerals.address.AddressSearch.Suggestion;

/** The stand-in answers are trimmed copies of real Photon answers for South African township addresses. */
class PhotonSearchTest {

	private static final String PHOTON = "https://photon.komoot.io";

	private final RestClient.Builder builder = RestClient.builder().baseUrl(PHOTON);

	private final MockRestServiceServer photon = MockRestServiceServer.bindTo(builder).build();

	private final PhotonSearch search = new PhotonSearch(builder);

	private void answer(String input, String featuresJson) {
		photon.expect(requestTo(allOf(startsWith(PHOTON + "/api?"), containsString("q=" + input.replace(" ", "%20")))))
			.andExpect(method(HttpMethod.GET))
			.andExpect(queryParam("bbox", "16.3,-35.0,33.0,-22.0"))
			.andRespond(withSuccess("{\"type\":\"FeatureCollection\",\"features\":[" + featuresJson + "]}",
					MediaType.APPLICATION_JSON));
	}

	@Test
	void keepsTheTypedHouseNumberWhenTheMapOnlyKnowsTheStreet() {
		answer("8115 Vilakazi", """
				{"type":"Feature","properties":{"osm_type":"W","osm_id":1,"type":"street","name":"Vilakazi Street",
				 "locality":"Orlando West","district":"Johannesburg Ward 130","city":"Soweto","state":"Gauteng",
				 "postcode":"1804","countrycode":"ZA"}}""");

		List<Suggestion> found = search.suggest("8115 Vilakazi", "unused-session");

		assertThat(found).hasSize(1);
		assertThat(found.get(0).main()).isEqualTo("8115 Vilakazi Street");
		assertThat(found.get(0).secondary()).isEqualTo("Orlando West, Soweto, Gauteng");
		assertThat(found.get(0).address())
			.isEqualTo(new Address("8115 Vilakazi Street, Orlando West", "Soweto", "Gauteng", "1804"));
	}

	@Test
	void leavesOutWardNamesAndOffersTownshipSections() {
		answer("Khayelitsha Site C", """
				{"type":"Feature","properties":{"osm_type":"N","osm_id":2,"type":"locality",
				 "name":"Mxolisi Phetani (Site C)","locality":"Mxolisi Phetani (Site C)","district":"Cape Town Ward 18",
				 "city":"Khayelitsha","county":"City of Cape Town","state":"Western Cape","postcode":"7783",
				 "countrycode":"ZA"}}""");

		Suggestion section = search.suggest("Khayelitsha Site C", "unused-session").get(0);

		assertThat(section.main()).isEqualTo("Mxolisi Phetani (Site C)");
		assertThat(section.address())
			.isEqualTo(new Address("Mxolisi Phetani (Site C)", "Khayelitsha", "Western Cape", "7783"));
	}

	@Test
	void usesTheTownshipNotTheCouncilAsTheTown() {
		answer("12 Vilakazi Street", """
				{"type":"Feature","properties":{"osm_type":"W","osm_id":9,"type":"street","name":"Vilakazi Street",
				 "district":"Sebokeng Unit 12","city":"Emfuleni Local Municipality",
				 "county":"Sedibeng District Municipality","state":"Gauteng","postcode":"1985","countrycode":"ZA"}}""");

		Suggestion s = search.suggest("12 Vilakazi Street", "unused-session").get(0);

		assertThat(s.secondary()).isEqualTo("Sebokeng Unit 12, Gauteng");
		assertThat(s.address()).isEqualTo(new Address("12 Vilakazi Street", "Sebokeng Unit 12", "Gauteng", "1985"));
	}

	@Test
	void usesTheHouseNumberTheMapKnows() {
		answer("9552 Nku", """
				{"type":"Feature","properties":{"osm_type":"N","osm_id":3,"type":"house","housenumber":"9552",
				 "street":"Nku Street","district":"Tshwane Ward 6","locality":"Mamelodi East","city":"Pretoria",
				 "state":"Gauteng","postcode":"0122","countrycode":"ZA"}}""");

		assertThat(search.suggest("9552 Nku", "unused-session").get(0).address())
			.isEqualTo(new Address("9552 Nku Street, Mamelodi East", "Pretoria", "Gauteng", "0122"));
	}

	@Test
	void onlySouthAfricanStreetsAndHomesNoDuplicates() {
		answer("Main Road", """
				{"type":"Feature","properties":{"osm_type":"W","osm_id":4,"type":"street","name":"Main Road",
				 "city":"Maseru","state":"Maseru","countrycode":"LS"}},
				{"type":"Feature","properties":{"osm_type":"N","osm_id":5,"type":"other","name":"Main Road Clinic",
				 "city":"Durban","state":"KwaZulu-Natal","countrycode":"ZA"}},
				{"type":"Feature","properties":{"osm_type":"R","osm_id":6,"type":"city","name":"Mainville",
				 "state":"Gauteng","countrycode":"ZA"}},
				{"type":"Feature","properties":{"osm_type":"W","osm_id":7,"type":"street","name":"Main Road",
				 "city":"Durban","state":"KwaZulu Natal","postcode":"4001","countrycode":"ZA"}},
				{"type":"Feature","properties":{"osm_type":"W","osm_id":8,"type":"street","name":"Main Road",
				 "city":"Durban","state":"KwaZulu Natal","postcode":"4001","countrycode":"ZA"}}""");

		assertThat(search.suggest("Main Road", "unused-session")).singleElement()
			.satisfies(s -> assertThat(s.secondary()).isEqualTo("Durban, KwaZulu-Natal"));
	}

	@Test
	void photonTroubleMeansNoSuggestionsNotAnError() {
		photon.expect(requestTo(startsWith(PHOTON + "/api?"))).andRespond(withServerError());

		assertThat(search.suggest("12 Oak Street", "unused-session")).isEmpty();
	}

}
