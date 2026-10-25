package za.co.astutefunerals.domain;

public enum Relationship implements Labelled {

	SPOUSE("Spouse"), CHILD("Child"), PARENT("Parent"), PARENT_IN_LAW("Parent-in-law"), SIBLING("Sibling"),
	GRANDPARENT("Grandparent"), OTHER_EXTENDED("Other extended family");

	private final String label;

	Relationship(String label) {
		this.label = label;
	}

	@Override
	public String label() {
		return label;
	}

	public boolean isExtended() {
		return this != SPOUSE && this != CHILD;
	}

}
