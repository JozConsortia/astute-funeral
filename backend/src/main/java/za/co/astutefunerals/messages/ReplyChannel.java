package za.co.astutefunerals.messages;

import za.co.astutefunerals.domain.Labelled;

/** How an admin replied to a contact message. */
public enum ReplyChannel implements Labelled {

	/** Sent by the server over SMTP. */
	EMAIL("Email"),

	/** Opened in the admin's own email app. */
	EMAIL_APP("Email (own app)"),

	WHATSAPP("WhatsApp"),

	/** The admin phoned the person; the body is a note of the call. */
	PHONE("Phone call");

	private final String label;

	ReplyChannel(String label) {
		this.label = label;
	}

	@Override
	public String label() {
		return label;
	}

}
