package za.co.astutefunerals.domain;

public enum PaymentMethod implements Labelled {

	DEBIT_ORDER("Debit order"), STOP_ORDER("Stop order (salary deduction)"), EFT("EFT / bank deposit");

	private final String label;

	PaymentMethod(String label) {
		this.label = label;
	}

	@Override
	public String label() {
		return label;
	}

}
