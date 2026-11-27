package za.co.astutefunerals.messages;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import za.co.astutefunerals.config.AppProperties;

/**
 * Emails the business mailbox when something new arrives from the website (a call-back request, a message or an
 * online application), so it is seen even when nobody has the dashboard open. Only works once email is set up
 * (see {@link MailService}); turn it off with {@code app.mail.alerts=false} or send it elsewhere with
 * {@code app.mail.alerts-to}. Sent in the background so the visitor never waits for the mail server, and a failure
 * is only logged. ID numbers are left out on purpose: the email only says who to call and where to look.
 */
@Component
public class StaffAlerts {

	private static final Logger log = LoggerFactory.getLogger(StaffAlerts.class);

	/**
	 * A fresh virtual thread per alert. (Not a Spring TaskExecutor bean: with scheduling enabled there are two, and
	 * an ambiguous lookup would quietly fall back to sending while the visitor waits.)
	 */
	private static final Executor BACKGROUND = task -> Thread.ofVirtual().name("staff-alert").start(task);

	private final MailService mail;

	private final boolean enabled;

	private final String to;

	private final String siteUrl;

	public StaffAlerts(MailService mail, AppProperties properties, @Value("${app.mail.alerts:true}") boolean enabled,
			@Value("${app.mail.alerts-to:}") String alertsTo, @Value("${app.mail.from:}") String from) {
		this.mail = mail;
		this.enabled = enabled;
		this.to = alertsTo.isBlank() ? from : alertsTo;
		this.siteUrl = properties.normalisedSiteUrl();
	}

	public void newMessage(String name, String phone, String email, String subject, String message) {
		boolean callBack = "Call-back request".equalsIgnoreCase(subject);
		send(callBack ? "Call-back request from " + name : "New message from " + name,
				(callBack ? "Someone asked us to call them back." : "A new message came in through the website.")
						+ "\n\nName:    " + name + "\nPhone:   " + orDash(phone) + "\nEmail:   " + orDash(email)
						+ "\nSubject: " + orDash(subject) + "\n\n" + message + "\n\nReply from the dashboard: " + siteUrl
						+ "/admin/messages");
	}

	public void newApplication(String reference, String fullName, String phone, String planName, int premium) {
		send("New application " + reference + ": " + fullName,
				"A new funeral policy application came in through the website.\n\nReference: " + reference
						+ "\nApplicant: " + fullName + "\nPhone:     " + phone + "\nPlan:      " + planName + " (R"
						+ premium + " per month)\n\nReview it in the dashboard: " + siteUrl + "/admin/applications?q="
						+ URLEncoder.encode(reference, StandardCharsets.UTF_8));
	}

	private void send(String subject, String body) {
		if (!enabled || to.isBlank() || !mail.isEnabled()) {
			return;
		}
		String oneLine = subject.replaceAll("[\\r\\n]+", " ");
		BACKGROUND.execute(() -> {
			try {
				mail.send(to, oneLine, body);
			}
			catch (RuntimeException ex) {
				log.warn("Could not email the staff alert \"{}\": {}", oneLine, ex.getMessage());
			}
		});
	}

	private static String orDash(String value) {
		return value == null || value.isBlank() ? "-" : value;
	}

}
