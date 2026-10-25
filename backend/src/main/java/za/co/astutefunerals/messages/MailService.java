package za.co.astutefunerals.messages;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends email replies when an SMTP server (SPRING_MAIL_HOST etc.) and a sender address
 * (MAIL_FROM) are configured. Without them, admins reply from their own email app instead.
 */
@Service
public class MailService {

	private final ObjectProvider<JavaMailSender> sender;

	private final String from;

	public MailService(ObjectProvider<JavaMailSender> sender, @Value("${app.mail.from:}") String from) {
		this.sender = sender;
		this.from = from;
	}

	public boolean isEnabled() {
		return !from.isBlank() && sender.getIfAvailable() != null;
	}

	public void send(String to, String subject, String body) throws MailException {
		SimpleMailMessage mail = new SimpleMailMessage();
		mail.setFrom(from);
		mail.setTo(to);
		mail.setSubject(subject);
		mail.setText(body);
		sender.getObject().send(mail);
	}

}
