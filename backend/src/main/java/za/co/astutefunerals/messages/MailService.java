package za.co.astutefunerals.messages;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends email replies when an SMTP server (spring.mail.*) and a sender address (app.mail.from) are
 * configured, for example in backend/config/application.yml. Without them, admins reply from their own
 * email app instead.
 */
@Service
public class MailService {

	private final ObjectProvider<JavaMailSender> sender;

	private final String from;

	private final boolean credentialsComplete;

	public MailService(ObjectProvider<JavaMailSender> sender, @Value("${app.mail.from:}") String from,
			@Value("${spring.mail.username:}") String username, @Value("${spring.mail.password:}") String password) {
		this.sender = sender;
		this.from = from;
		// A username without a password means the setup isn't finished yet; don't offer a button that would fail.
		this.credentialsComplete = username.isBlank() || !password.isBlank();
	}

	public boolean isEnabled() {
		return !from.isBlank() && credentialsComplete && sender.getIfAvailable() != null;
	}

	public void send(String to, String subject, String body) throws MailException {
		SimpleMailMessage mail = new SimpleMailMessage();
		mail.setFrom(from);
		mail.setReplyTo(from);
		mail.setTo(to);
		mail.setSubject(subject);
		mail.setText(body);
		sender.getObject().send(mail);
	}

}
