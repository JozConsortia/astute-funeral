package za.co.astutefunerals.config;

import java.util.List;
import java.util.Optional;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app")
public record AppProperties(String siteUrl, Admin admin, List<Plan> plans) {

	public record Admin(String username, String password) {
	}

	public record Plan(String id, String name, int cover, int premium, boolean spouse, int maxChildren,
			int maxExtended, boolean featured, String summary, List<String> features) {
	}

	public Optional<Plan> plan(String id) {
		return plans.stream().filter(p -> p.id().equals(id)).findFirst();
	}

	public String normalisedSiteUrl() {
		return siteUrl.endsWith("/") ? siteUrl.substring(0, siteUrl.length() - 1) : siteUrl;
	}

}
