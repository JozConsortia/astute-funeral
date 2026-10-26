package za.co.astutefunerals.applications;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import za.co.astutefunerals.applications.ApplicationViews.Detail;

/**
 * Builds the Excel (.xlsx) export of applications. ID numbers and phone numbers are written as text so Excel
 * keeps every digit and the leading zero; amounts and dates are real numbers and dates so they sort and sum.
 */
final class ExcelExporter {

	static final String CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

	private enum Kind {

		TEXT, DATE, MONEY

	}

	private record Column(String header, Kind kind, int width, Function<Detail, Object> value) {
	}

	private static final List<Column> COLUMNS = List.of(new Column("Reference", Kind.TEXT, 16, Detail::reference),
			new Column("Date", Kind.DATE, 12, d -> LocalDate.ofInstant(d.createdAt(), ZoneOffset.UTC)),
			new Column("Status", Kind.TEXT, 12, d -> d.status().label()),
			new Column("Plan", Kind.TEXT, 22, Detail::planName),
			new Column("Cover", Kind.MONEY, 12, Detail::coverAmount),
			new Column("Premium", Kind.MONEY, 11, Detail::monthlyPremium),
			new Column("Title", Kind.TEXT, 7, Detail::title), new Column("First name", Kind.TEXT, 16, Detail::firstName),
			new Column("Surname", Kind.TEXT, 16, Detail::lastName),
			new Column("ID / Passport", Kind.TEXT, 16, Detail::idNumber),
			new Column("Date of birth", Kind.DATE, 13, Detail::dateOfBirth),
			new Column("Gender", Kind.TEXT, 9, Detail::gender), new Column("Cellphone", Kind.TEXT, 14, Detail::phone),
			new Column("Alt phone", Kind.TEXT, 14, Detail::altPhone), new Column("Email", Kind.TEXT, 28, Detail::email),
			new Column("Address", Kind.TEXT, 30, Detail::address), new Column("City", Kind.TEXT, 14, Detail::city),
			new Column("Province", Kind.TEXT, 14, Detail::province),
			new Column("Postal code", Kind.TEXT, 11, Detail::postalCode),
			new Column("Dependants", Kind.TEXT, 40,
					d -> d.dependants()
						.stream()
						.map(x -> x.firstName() + " " + x.lastName() + " (" + x.relationship().label() + ")")
						.collect(Collectors.joining("; "))),
			new Column("Beneficiary", Kind.TEXT, 34,
					d -> d.beneficiary().firstName() + " " + d.beneficiary().lastName() + " ("
							+ d.beneficiary().relationship() + ") " + d.beneficiary().phone()),
			new Column("Payment", Kind.TEXT, 14, d -> d.paymentMethod().label()),
			new Column("Debit day", Kind.TEXT, 9, Detail::debitDay),
			new Column("Source", Kind.TEXT, 10, d -> d.source().name().toLowerCase()),
			new Column("Captured by", Kind.TEXT, 16, Detail::capturedBy),
			new Column("Last updated by", Kind.TEXT, 16, Detail::lastUpdatedBy),
			new Column("Notes", Kind.TEXT, 40, Detail::notes));

	private ExcelExporter() {
	}

	static byte[] toXlsx(List<Detail> rows) {
		try (XSSFWorkbook book = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			Sheet sheet = book.createSheet("Applications");
			CellStyle header = headerStyle(book);
			CellStyle text = book.createCellStyle();
			text.setDataFormat(book.createDataFormat().getFormat("@"));
			CellStyle date = book.createCellStyle();
			date.setDataFormat(book.createDataFormat().getFormat("yyyy-mm-dd"));
			CellStyle money = book.createCellStyle();
			money.setDataFormat(book.createDataFormat().getFormat("\"R\" #,##0"));

			Row head = sheet.createRow(0);
			for (int c = 0; c < COLUMNS.size(); c++) {
				Cell cell = head.createCell(c);
				cell.setCellValue(COLUMNS.get(c).header());
				cell.setCellStyle(header);
				sheet.setColumnWidth(c, COLUMNS.get(c).width() * 256);
			}

			for (int r = 0; r < rows.size(); r++) {
				Row row = sheet.createRow(r + 1);
				for (int c = 0; c < COLUMNS.size(); c++) {
					Column col = COLUMNS.get(c);
					Object value = col.value().apply(rows.get(r));
					Cell cell = row.createCell(c);
					if (value == null) {
						cell.setCellStyle(text);
						continue;
					}
					switch (col.kind()) {
						case DATE -> {
							cell.setCellValue((LocalDate) value);
							cell.setCellStyle(date);
						}
						case MONEY -> {
							cell.setCellValue(((Number) value).doubleValue());
							cell.setCellStyle(money);
						}
						// Stored as a string, so Excel never evaluates it as a formula.
						case TEXT -> {
							cell.setCellValue(value.toString());
							cell.setCellStyle(text);
						}
					}
				}
			}

			sheet.createFreezePane(0, 1);
			sheet.setAutoFilter(new CellRangeAddress(0, Math.max(rows.size(), 1), 0, COLUMNS.size() - 1));
			book.write(out);
			return out.toByteArray();
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
	}

	/** Bold gold text on black, matching the site. */
	private static CellStyle headerStyle(XSSFWorkbook book) {
		XSSFFont font = book.createFont();
		font.setBold(true);
		font.setColor(new XSSFColor(new byte[] { (byte) 0xF6, (byte) 0xD7, (byte) 0x6B }));
		XSSFCellStyle style = book.createCellStyle();
		style.setFont(font);
		style.setFillForegroundColor(new XSSFColor(new byte[] { 0, 0, 0 }));
		style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
		style.setBorderBottom(BorderStyle.THIN);
		style.setBottomBorderColor(new XSSFColor(new byte[] { (byte) 0xE0, (byte) 0xB4, 0x3C }));
		return style;
	}

}
