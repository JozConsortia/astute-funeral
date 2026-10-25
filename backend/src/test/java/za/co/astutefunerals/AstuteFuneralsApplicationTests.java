package za.co.astutefunerals;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = { "spring.datasource.url=jdbc:h2:mem:test", "app.admin.password=test-password" })
class AstuteFuneralsApplicationTests {

	@Test
	void contextLoads() {
	}

}
