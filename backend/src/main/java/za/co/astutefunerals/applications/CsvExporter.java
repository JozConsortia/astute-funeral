package za.co.astutefunerals.applications;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import za.co.astutefunerals.applications.ApplicationViews.Detail;

/** Builds the Excel-friendly CSV export of applications. */
final class CsvExporter {

	private record Column(String header, Function<Detail, Object> value) {
	}

	private static final List<Column> COLUMNS = List.of(new Column("Reference", Detail::reference),
			new Column("Date", d -> d.createdAt().toString().substring(0, 10)),
			new Column("Status", d -> d.status().label()), new Column("Plan", Detail::planName),
			new Column("Cover", Detail::coverAmount), new Column("Premium", Detail::monthlyPremium),
			new Column("Title", Detail::title), new Column("First name", Detail::firstName),
			new Column("Surname", Detail::lastName), new Column("ID / Passport", Detail::idNumber),
			new Column("Date of birth", Detail::dateOfBirth), new Column("Gender", Detail::gender),
			new Column("Cellphone", Detail::phone), new Column("Alt phone", Detail::altPhone),
			new Column("Email", Detail::email), new Column("Address", Detail::address),
			new Column("City", Detail::city), new Column("Province", Detail::province),
			new Column("Postal code", Detail::postalCode),
			new Column("Dependants",
					d -> d.dependants()
						.stream()
						.map(x -> x.firstName() + " " + x.lastName() + " (" + x.relationship().label() + ")")
						.collect(Collectors.joining("; "))),
			new Column("Beneficiary",
					d -> d.beneficiary().firstName() + " " + d.beneficiary().lastName() + " ("
							+ d.beneficiary().relationship() + ") " + d.beneficiary().phone()),
			new Column("Payment", d -> d.paymentMethod().label()), new Column("Debit day", Detail::debitDay),
			new Column("Source", d -> d.source().name().toLowerCase()), new Column("Captured by", Detail::capturedBy),
			new Column("Last updated by", Detail::lastUpdatedBy), new Column("Notes", Detail::notes));

	private CsvExporter() {
	}

	static String toCsv(List<Detail> rows) {
		Stream<String> header = Stream.of(COLUMNS.stream().map(c -> cell(c.header())).collect(Collectors.joining(",")));
		Stream<String> body = rows.stream()
			.map(r -> COLUMNS.stream().map(c -> cell(c.value().apply(r))).collect(Collectors.joining(",")));
		// BOM so Excel opens the file as UTF-8.
		return "﻿" + Stream.concat(header, body).collect(Collectors.joining("\r\n"));
	}

	/** Quotes every cell and neutralises spreadsheet formula injection. */
	private static String cell(Object value) {
		String s = value == null ? "" : value.toString();
		if (!s.isEmpty() && "=+-@\t\r".indexOf(s.charAt(0)) >= 0) {
			s = "'" + s;
		}
		return "\"" + s.replace("\"", "\"\"") + "\"";
	}

}
