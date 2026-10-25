package za.co.astutefunerals.domain;

public enum ApplicationStatus implements Labelled {

	NEW("New"), IN_REVIEW("In review"), APPROVED("Approved"), DECLINED("Declined");

	private final String label;

	ApplicationStatus(String label) {
		this.label = label;
	}

	@Override
	public String label() {
		return label;
	}

}
