package za.co.astutefunerals.messages;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static za.co.astutefunerals.applications.ApplicationValidator.clean;
import static za.co.astutefunerals.applications.ApplicationValidator.isValidEmail;
import static za.co.astutefunerals.applications.ApplicationValidator.isValidPhone;

import za.co.astutefunerals.admin.AdminDirectory;
import za.co.astutefunerals.domain.Labelled;
import za.co.astutefunerals.web.ValidationException;

@RestController
public class ContactController {

	private static final Logger log = LoggerFactory.getLogger(ContactController.class);

	private final ContactMessageRepository messages;

	private final MailService mail;

	private final AdminDirectory directory;

	private final Clock clock;

	private final StaffAlerts alerts;

	public ContactController(ContactMessageRepository messages, MailService mail, AdminDirectory directory,
			Clock clock, StaffAlerts alerts) {
		this.messages = messages;
		this.mail = mail;
		this.directory = directory;
		this.clock = clock;
		this.alerts = alerts;
	}

	public record ContactRequest(String name, String email, String phone, String subject, String message,
			String website) {
	}

	public record ReadRequest(boolean read) {
	}

	public record ReplyRequest(String body, String channel) {
	}

	public record ReplyView(Long id, String body, ReplyChannel channel, String sentBy, Instant sentAt) {

		static ReplyView of(MessageReply r) {
			return new ReplyView(r.getId(), r.getBody(), r.getChannel(), r.getSentBy(), r.getSentAt());
		}

	}

	public record MessageView(Long id, String name, String email, String phone, String subject, String message,
			boolean read, Instant createdAt, List<ReplyView> replies) {

		static MessageView of(ContactMessage m) {
			return new MessageView(m.getId(), m.getName(), m.getEmail(), m.getPhone(), m.getSubject(), m.getMessage(),
					m.isRead(), m.getCreatedAt(), m.getReplies().stream().map(ReplyView::of).toList());
		}

	}

	@PostMapping("/api/contact")
	@ResponseStatus(HttpStatus.CREATED)
	public void send(@RequestBody ContactRequest req) {
		if (req.website() != null && !req.website().isBlank()) {
			return; // honeypot
		}
		Map<String, String> errors = new LinkedHashMap<>();
		String name = clean(req.name(), 80);
		String email = clean(req.email(), 120).toLowerCase();
		String phone = clean(req.phone(), 20);
		String subject = clean(req.subject(), 120);
		String message = req.message() == null ? "" : req.message().strip();
		if (message.length() > 3000) {
			message = message.substring(0, 3000);
		}
		if (name.length() < 2) {
			errors.put("name", "Please enter your name.");
		}
		if (email.isEmpty() && phone.isEmpty()) {
			errors.put("email", "Give us an email address or phone number.");
		}
		if (!email.isEmpty() && !isValidEmail(email)) {
			errors.put("email", "Enter a valid email address.");
		}
		if (!phone.isEmpty() && !isValidPhone(phone)) {
			errors.put("phone", "Enter a valid phone number.");
		}
		if (message.length() < 10) {
			errors.put("message", "Please write a short message (10+ characters).");
		}
		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}
		messages.save(new ContactMessage(name, email, phone, subject, message, Instant.now(clock)));
		alerts.newMessage(name, phone, email, subject, message);
	}

	@GetMapping("/api/admin/messages")
	@Transactional(readOnly = true)
	public List<MessageView> list() {
		return messages.findTop200ByOrderByCreatedAtDesc().stream().map(MessageView::of).toList();
	}

	@PatchMapping("/api/admin/messages/{id}")
	@Transactional
	public void markRead(@PathVariable long id, @RequestBody ReadRequest req) {
		find(id).setRead(req.read());
	}

	/**
	 * Records a reply. For {@code EMAIL} the server sends it; for the other channels the admin's
	 * device opens WhatsApp / their email app / the dialler and this just logs what was said.
	 */
	@PostMapping("/api/admin/messages/{id}/replies")
	@ResponseStatus(HttpStatus.CREATED)
	@Transactional
	public ReplyView reply(@PathVariable long id, @RequestBody ReplyRequest req, Authentication auth) {
		ContactMessage message = find(id);
		String body = req.body() == null ? "" : req.body().strip();
		ReplyChannel channel = Labelled.parse(ReplyChannel.class, req.channel()).orElse(null);
		Map<String, String> errors = new LinkedHashMap<>();
		if (body.length() < 2) {
			errors.put("body", "Write a reply first.");
		}
		else if (body.length() > 3000) {
			errors.put("body", "Keep replies under 3000 characters.");
		}
		if (channel == null) {
			errors.put("channel", "Choose how to reply.");
		}
		else if ((channel == ReplyChannel.EMAIL || channel == ReplyChannel.EMAIL_APP)
				&& (message.getEmail() == null || message.getEmail().isBlank())) {
			errors.put("channel", "This person didn't leave an email address.");
		}
		else if (channel == ReplyChannel.WHATSAPP && (message.getPhone() == null || message.getPhone().isBlank())) {
			errors.put("channel", "This person didn't leave a phone number.");
		}
		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}

		if (channel == ReplyChannel.EMAIL) {
			if (!mail.isEnabled()) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Email sending isn't set up on the server yet.");
			}
			try {
				String subject = "Re: " + (message.getSubject() == null || message.getSubject().isBlank()
						? "Your message to Astute Funerals" : message.getSubject());
				mail.send(message.getEmail(), subject, withOriginal(body, message, clock.getZone()));
			}
			catch (MailException ex) {
				log.warn("Could not email reply for message {}", id, ex);
				throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
						"The email could not be sent. Please try again or reply from your own email app.");
			}
		}
		MessageReply reply = message.addReply(body, channel, directory.displayName(auth), Instant.now(clock));
		messages.flush(); // assign the reply's id before returning it
		return ReplyView.of(reply);
	}

	@DeleteMapping("/api/admin/messages/{id}")
	public void delete(@PathVariable long id) {
		messages.delete(find(id));
	}

	/** The reply followed by the person's own message, quoted the way email programs usually show it. */
	static String withOriginal(String reply, ContactMessage message, ZoneId zone) {
		String when = DateTimeFormatter.ofPattern("d MMMM yyyy 'at' HH:mm", Locale.ENGLISH)
			.format(message.getCreatedAt().atZone(zone));
		String quoted = message.getMessage().lines().map(line -> "> " + line).collect(Collectors.joining("\n"));
		return reply + "\n\n-----\nOn " + when + ", " + message.getName() + " wrote:\n" + quoted;
	}

	private ContactMessage find(long id) {
		return messages.findById(id)
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found."));
	}

}
