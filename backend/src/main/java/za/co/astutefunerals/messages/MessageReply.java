package za.co.astutefunerals.messages;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A reply (or call note) an admin recorded against a contact message. */
@Entity
@Table(name = "message_replies")
public class MessageReply {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "message_id")
	private ContactMessage message;

	@Column(nullable = false, length = 3000)
	private String body;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ReplyChannel channel;

	@Column(nullable = false, length = 80)
	private String sentBy;

	@Column(nullable = false)
	private Instant sentAt;

	protected MessageReply() {
	}

	MessageReply(ContactMessage message, String body, ReplyChannel channel, String sentBy, Instant sentAt) {
		this.message = message;
		this.body = body;
		this.channel = channel;
		this.sentBy = sentBy;
		this.sentAt = sentAt;
	}

	public Long getId() {
		return id;
	}

	public String getBody() {
		return body;
	}

	public ReplyChannel getChannel() {
		return channel;
	}

	public String getSentBy() {
		return sentBy;
	}

	public Instant getSentAt() {
		return sentAt;
	}

}
