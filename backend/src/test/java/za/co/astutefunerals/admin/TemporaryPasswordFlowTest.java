package za.co.astutefunerals.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A new user gets a generated temporary password, must replace it with a strong one before using the
 * dashboard, and can then be deactivated or deleted by a super admin.
 */
@SpringBootTest(properties = { "spring.datasource.url=jdbc:h2:mem:password-flow", "app.admin.password=test-password" })
@AutoConfigureMockMvc
class TemporaryPasswordFlowTest {

	@Autowired
	MockMvc mvc;

	private MockHttpSession login(String username, String password) throws Exception {
		MockHttpSession session = new MockHttpSession();
		mvc.perform(post("/api/admin/login").session(session).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"username\":\"" + username + "\",\"password\":\"" + password.replace("\"", "\\\"") + "\"}"))
			.andExpect(status().isOk());
		return session;
	}

	@Test
	void newUserMustSetAStrongPasswordAndCanThenBeDeactivatedAndDeleted() throws Exception {
		MockHttpSession superAdmin = login("admin", "test-password");

		String created = mvc.perform(post("/api/admin/users").session(superAdmin).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"fullName\":\"Thandi Nkosi\",\"username\":\"thandi\",\"role\":\"ADMIN\"}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.user.mustChangePassword").value(true))
			.andReturn().getResponse().getContentAsString();
		String temporary = JsonPath.read(created, "$.temporaryPassword");
		long id = ((Number) JsonPath.read(created, "$.user.id")).longValue();

		// Signed in with the temporary password: only the profile and the password change are allowed.
		MockHttpSession thandi = login("thandi", temporary);
		mvc.perform(get("/api/admin/me").session(thandi)).andExpect(jsonPath("$.mustChangePassword").value(true));
		mvc.perform(get("/api/admin/stats").session(thandi)).andExpect(status().isForbidden());

		mvc.perform(post("/api/admin/password").session(thandi).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"current\":\"" + temporary + "\",\"next\":\"weakpassword\"}"))
			.andExpect(status().is(422))
			.andExpect(jsonPath("$.errors.next").value(
					"Your password needs an uppercase letter, a number and a special character such as ! @ # or ?."));

		mvc.perform(post("/api/admin/password").session(thandi).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"current\":\"" + temporary + "\",\"next\":\"Dignity#2026\"}"))
			.andExpect(status().isOk());
		mvc.perform(get("/api/admin/stats").session(thandi)).andExpect(status().isOk());
		mvc.perform(get("/api/admin/me").session(thandi)).andExpect(jsonPath("$.mustChangePassword").value(false));

		// Deactivated: signed out straight away.
		mvc.perform(patch("/api/admin/users/" + id).session(superAdmin).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"fullName\":\"Thandi Nkosi\",\"role\":\"ADMIN\",\"active\":false}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.active").value(false));
		mvc.perform(get("/api/admin/me").session(thandi)).andExpect(status().isUnauthorized());

		mvc.perform(delete("/api/admin/users/" + id).session(superAdmin).with(csrf())).andExpect(status().isOk());
		mvc.perform(get("/api/admin/users").session(superAdmin))
			.andExpect(jsonPath("$[?(@.username == 'thandi')]").isEmpty());
	}

	@Test
	void resettingAPasswordIssuesANewTemporaryOne() throws Exception {
		MockHttpSession superAdmin = login("admin", "test-password");
		String created = mvc.perform(post("/api/admin/users").session(superAdmin).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"fullName\":\"Sipho Dlamini\",\"username\":\"sipho\",\"role\":\"ADMIN\"}"))
			.andReturn().getResponse().getContentAsString();
		long id = ((Number) JsonPath.read(created, "$.user.id")).longValue();
		String first = JsonPath.read(created, "$.temporaryPassword");

		String reset = mvc.perform(post("/api/admin/users/" + id + "/password").session(superAdmin).with(csrf()))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();
		String second = JsonPath.read(reset, "$.temporaryPassword");

		assertThat(second).isNotEqualTo(first);
		MockHttpSession sipho = login("sipho", second);
		mvc.perform(get("/api/admin/me").session(sipho)).andExpect(jsonPath("$.mustChangePassword").value(true));
	}

}
