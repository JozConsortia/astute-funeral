package za.co.astutefunerals.address;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Google when a key is set, otherwise the free Photon service, unless that is switched off too. */
class AddressSearchTest {

	private static final String GOOGLE = "https://places.googleapis.com";

	private static final String PHOTON = "https://photon.komoot.io";

	@Test
	void usesGoogleWhenAKeyIsSet() {
		assertThat(new AddressSearch("my-key", GOOGLE, true, PHOTON).provider()).isEqualTo("google");
	}

	@Test
	void usesTheFreeServiceWithoutAKey() {
		assertThat(new AddressSearch("  ", GOOGLE, true, PHOTON).provider()).isEqualTo("openstreetmap");
	}

	@Test
	void canBeSwitchedOffCompletely() {
		AddressSearch off = new AddressSearch("", GOOGLE, false, PHOTON);
		assertThat(off.isEnabled()).isFalse();
		assertThat(off.provider()).isEmpty();
		assertThat(off.suggest("12 Oak Street", "session-123")).isEmpty();
		assertThat(off.details("ChIJ_danville_4", "session-123")).isEmpty();
	}

}
