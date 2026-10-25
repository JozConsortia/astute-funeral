package za.co.astutefunerals.web;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import za.co.astutefunerals.config.AppProperties;

/** Serves the React app for its routes, plus robots.txt and sitemap.xml for search engines. */
@Controller
public class SiteController {

	private static final List<String> PUBLIC_PAGES = List.of("/", "/about", "/get-covered", "/apply", "/contact");

	private final AppProperties properties;

	public SiteController(AppProperties properties) {
		this.properties = properties;
	}

	@GetMapping({ "/about", "/get-covered", "/apply", "/contact", "/admin", "/admin/**" })
	public String app() {
		return "forward:/index.html";
	}

	@GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
	@ResponseBody
	public String robots() {
		return "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: "
				+ properties.normalisedSiteUrl() + "/sitemap.xml\n";
	}

	@GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
	@ResponseBody
	public String sitemap() {
		String today = LocalDate.now().toString();
		String urls = PUBLIC_PAGES.stream()
			.map(p -> "  <url><loc>" + properties.normalisedSiteUrl() + p + "</loc><lastmod>" + today
					+ "</lastmod><changefreq>monthly</changefreq><priority>" + ("/".equals(p) ? "1.0" : "0.8")
					+ "</priority></url>")
			.collect(Collectors.joining("\n"));
		return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
				+ "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" + urls + "\n</urlset>\n";
	}

}
