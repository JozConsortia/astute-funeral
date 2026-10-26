package za.co.astutefunerals.messages;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** A reply sent with "Send email" goes from the business address to the person who wrote in. */
@SpringBootTest(properties = { "spring.datasource.url=jdbc:h2:mem:email-reply", "app.admin.password=test-password",
		"app.mail.from=Astute Funerals <info@example.co.za>", "spring.mail.host=smtp.example.co.za",
		"spring.mail.username=info@example.co.za", "spring.mail.password=secret" })
@AutoConfigureMockMvc
class EmailReplyTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	ContactMessageRepository messages;

	@MockitoBean
	JavaMailSender mailSender;

	@Test
	void emailsTheReplyWithTheOriginalMessageQuoted() throws Exception {
		long id = messages.save(new ContactMessage("Thandi Mokoena", "thandi@example.com", "", "Family plan question",
				"Can I add my mother-in-law?\nShe is 70.", Instant.parse("2026-10-26T09:15:00Z")))
			.getId();

		MockHttpSession session = new MockHttpSession();
		mvc.perform(post("/api/admin/login").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"username\":\"admin\",\"password\":\"test-password\"}")).andExpect(status().isOk());
		mvc.perform(get("/api/admin/me").session(session)).andExpect(jsonPath("$.emailEnabled").value(true));

		mvc.perform(post("/api/admin/messages/" + id + "/replies").session(session).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"body\":\"Yes, on the Extended Family Plan.\",\"channel\":\"EMAIL\"}"))
			.andExpect(status().isCreated());

		ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
		verify(mailSender).send(sent.capture());
		SimpleMailMessage mail = sent.getValue();
		assertThat(mail.getTo()).containsExactly("thandi@example.com");
		assertThat(mail.getFrom()).isEqualTo("Astute Funerals <info@example.co.za>");
		assertThat(mail.getSubject()).isEqualTo("Re: Family plan question");
		assertThat(mail.getText()).startsWith("Yes, on the Extended Family Plan.")
			.contains("Thandi Mokoena wrote:\n> Can I add my mother-in-law?\n> She is 70.");
	}

	@Test
	void quotesTheOriginalWithItsDateInTheBusinessTimeZone() {
		ContactMessage message = new ContactMessage("Sipho", "s@example.com", "", "Hi", "Hello there",
				Instant.parse("2026-10-26T09:15:00Z"));

		assertThat(ContactController.withOriginal("Thanks!", message, ZoneId.of("Africa/Johannesburg")))
			.isEqualTo("Thanks!\n\n-----\nOn 26 October 2026 at 11:15, Sipho wrote:\n> Hello there");
	}

	@Test
	void staysOffUntilThePasswordIsFilledIn() {
		assertThat(new MailService(null, "info@example.co.za", "info@example.co.za", "").isEnabled()).isFalse();
	}

}
