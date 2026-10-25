package za.co.astutefunerals.messages;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A message sent from the website's Contact page. */
@Entity
@Table(name = "messages")
public class ContactMessage {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 80)
	private String name;

	@Column(length = 120)
	private String email;

	@Column(length = 20)
	private String phone;

	@Column(length = 120)
	private String subject;

	@Column(nullable = false, length = 3000)
	private String message;

	@Column(name = "is_read", nullable = false)
	private boolean read;

	@Column(nullable = false)
	private Instant createdAt;

	@OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("sentAt asc")
	private List<MessageReply> replies = new ArrayList<>();

	protected ContactMessage() {
	}

	MessageReply addReply(String body, ReplyChannel channel, String sentBy, Instant sentAt) {
		MessageReply reply = new MessageReply(this, body, channel, sentBy, sentAt);
		replies.add(reply);
		read = true;
		return reply;
	}

	public List<MessageReply> getReplies() {
		return replies;
	}

	public ContactMessage(String name, String email, String phone, String subject, String message, Instant createdAt) {
		this.name = name;
		this.email = email;
		this.phone = phone;
		this.subject = subject;
		this.message = message;
		this.createdAt = createdAt;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getEmail() {
		return email;
	}

	public String getPhone() {
		return phone;
	}

	public String getSubject() {
		return subject;
	}

	public String getMessage() {
		return message;
	}

	public boolean isRead() {
		return read;
	}

	public void setRead(boolean read) {
		this.read = read;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

}
