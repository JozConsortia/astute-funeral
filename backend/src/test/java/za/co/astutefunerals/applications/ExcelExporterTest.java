package za.co.astutefunerals.applications;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import za.co.astutefunerals.applications.ApplicationViews.BeneficiaryView;
import za.co.astutefunerals.applications.ApplicationViews.DependantView;
import za.co.astutefunerals.applications.ApplicationViews.Detail;
import za.co.astutefunerals.domain.ApplicationSource;
import za.co.astutefunerals.domain.ApplicationStatus;
import za.co.astutefunerals.domain.PaymentMethod;
import za.co.astutefunerals.domain.Relationship;

class ExcelExporterTest {

	private static Detail detail(String notes) {
		return new Detail(1L, "AF-2026-0001", "family", "Family Plan", 15000, 185, "Mr", "Thabo", "Mokoena",
				"8501015800088", LocalDate.of(1985, 1, 1), "male", "married", "0821234567", "", "thabo@example.com",
				"12 Oak Street", "Soweto", "Gauteng", "0183",
				List.of(new DependantView(Relationship.SPOUSE, "Lerato", "Mokoena", "8703030800081", null)),
				new BeneficiaryView("Lerato", "Mokoena", "8703030800081", "Wife", "0835551234"),
				PaymentMethod.DEBIT_ORDER, "25", ApplicationStatus.NEW, notes, ApplicationSource.WEBSITE, null, null,
				Instant.parse("2026-10-25T10:00:00Z"), Instant.parse("2026-10-25T10:00:00Z"));
	}

	private static Sheet read(byte[] xlsx) throws IOException {
		return new XSSFWorkbook(new ByteArrayInputStream(xlsx)).getSheetAt(0);
	}

	private static int column(Sheet sheet, String header) {
		for (var cell : sheet.getRow(0)) {
			if (cell.getStringCellValue().equals(header)) {
				return cell.getColumnIndex();
			}
		}
		throw new AssertionError("No column " + header);
	}

	@Test
	void keepsIdAndPhoneNumbersAsExactText() throws IOException {
		Sheet sheet = read(ExcelExporter.toXlsx(List.of(detail(null))));
		Row row = sheet.getRow(1);

		assertThat(row.getCell(column(sheet, "ID / Passport")).getCellType()).isEqualTo(CellType.STRING);
		assertThat(row.getCell(column(sheet, "ID / Passport")).getStringCellValue()).isEqualTo("8501015800088");
		assertThat(row.getCell(column(sheet, "Cellphone")).getStringCellValue()).isEqualTo("0821234567");
		assertThat(row.getCell(column(sheet, "Postal code")).getStringCellValue()).isEqualTo("0183");
	}

	@Test
	void writesAmountsAsNumbersAndDatesAsDates() throws IOException {
		Sheet sheet = read(ExcelExporter.toXlsx(List.of(detail(null))));
		Row row = sheet.getRow(1);

		assertThat(row.getCell(column(sheet, "Premium")).getNumericCellValue()).isEqualTo(185);
		assertThat(row.getCell(column(sheet, "Date of birth")).getLocalDateTimeCellValue().toLocalDate())
			.isEqualTo(LocalDate.of(1985, 1, 1));
		assertThat(row.getCell(column(sheet, "Dependants")).getStringCellValue()).isEqualTo("Lerato Mokoena (Spouse)");
	}

	@Test
	void neverTurnsTextIntoAFormula() throws IOException {
		Sheet sheet = read(ExcelExporter.toXlsx(List.of(detail("=HYPERLINK(\"http://evil\")"))));
		var notes = sheet.getRow(1).getCell(column(sheet, "Notes"));

		assertThat(notes.getCellType()).isEqualTo(CellType.STRING);
		assertThat(notes.getStringCellValue()).isEqualTo("=HYPERLINK(\"http://evil\")");
	}

	@Test
	void exportsHeaderOnlyWhenThereAreNoApplications() throws IOException {
		Sheet sheet = read(ExcelExporter.toXlsx(List.of()));

		assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Reference");
		assertThat(sheet.getLastRowNum()).isZero();
	}

}
