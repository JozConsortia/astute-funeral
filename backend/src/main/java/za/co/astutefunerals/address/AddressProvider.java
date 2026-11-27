package za.co.astutefunerals.address;

import java.util.List;
import java.util.Optional;

import za.co.astutefunerals.address.AddressSearch.Address;
import za.co.astutefunerals.address.AddressSearch.Suggestion;

/** A service that suggests addresses while someone types: Google Places, or the free Photon (OpenStreetMap). */
interface AddressProvider {

	/** Shown to the website so it can credit the right source: "google" or "openstreetmap". */
	String name();

	List<Suggestion> suggest(String input, String sessionToken);

	/** Full address for a picked suggestion that didn't already carry one. */
	Optional<Address> details(String id, String sessionToken);

}
