package za.co.astutefunerals.messages;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Call-back requests and online applications are emailed to the business mailbox once email is set up. */
@SpringBootTest(properties = { "spring.datasource.url=jdbc:h2:mem:staff-alerts", "app.admin.password=test-password",
		"app.site-url=https://www.example.co.za", "app.mail.from=Astute Funerals <info@example.co.za>",
		"spring.mail.host=smtp.example.co.za", "spring.mail.username=info@example.co.za",
		"spring.mail.password=secret" })
@AutoConfigureMockMvc
class StaffAlertsTest {

	@Autowired
	MockMvc mvc;

	@MockitoBean
	JavaMailSender mailSender;

	@Test
	void emailsTheBusinessAboutACallBackRequest() throws Exception {
		mvc.perform(post("/api/contact").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"name":"Johannes Botha","phone":"072 333 4444","email":"","subject":"Call-back request",
					 "message":"Please call me back.","website":""}"""))
			.andExpect(status().isCreated());

		SimpleMailMessage mail = sentMail();
		assertThat(mail.getTo()).containsExactly("Astute Funerals <info@example.co.za>");
		assertThat(mail.getSubject()).isEqualTo("Call-back request from Johannes Botha");
		assertThat(mail.getText()).contains("Phone:   072 333 4444")
			.contains("https://www.example.co.za/admin/messages");
	}

	@Test
	void emailsTheBusinessAboutAnOnlineApplicationWithoutTheIdNumber() throws Exception {
		mvc.perform(post("/api/applications").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"plan":"family","title":"Mr","firstName":"Thabo","lastName":"Mokoena",
					 "idNumber":"8501015800088","dateOfBirth":"1985-01-01","gender":"male","maritalStatus":"married",
					 "phone":"082 123 4567","altPhone":"","email":"","address":"12 Oak Street","city":"Soweto",
					 "province":"Gauteng","postalCode":"1804","dependants":[],
					 "beneficiary":{"firstName":"Lerato","lastName":"Mokoena","idNumber":"8703030800081",
					                "relationship":"Wife","phone":"083 555 1234"},
					 "paymentMethod":"DEBIT_ORDER","debitDay":"25","consent":true,"declaration":true,"website":""}"""))
			.andExpect(status().isCreated());

		SimpleMailMessage mail = sentMail();
		assertThat(mail.getSubject()).startsWith("New application AF-").endsWith(": Thabo Mokoena");
		assertThat(mail.getText()).contains("Family Plan (R185 per month)")
			.contains("https://www.example.co.za/admin/applications?q=AF-")
			.doesNotContain("8501015800088");
	}

	@Test
	void theVisitorNeverWaitsForTheMailServer() throws Exception {
		doAnswer(invocation -> {
			Thread.sleep(3000); // a slow mail server
			return null;
		}).when(mailSender).send(any(SimpleMailMessage.class));

		long started = System.nanoTime();
		mvc.perform(post("/api/contact").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"name":"Sipho Ndlovu","phone":"061 555 6666","email":"","subject":"Claim documents",
					 "message":"Which documents do I need for a claim?","website":""}"""))
			.andExpect(status().isCreated());

		assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofMillis(1500));
		verify(mailSender, timeout(6000)).send(any(SimpleMailMessage.class)); // still sent, just in the background
	}

	private SimpleMailMessage sentMail() {
		ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
		verify(mailSender, timeout(5000)).send(sent.capture()); // sent in the background
		return sent.getValue();
	}

}
