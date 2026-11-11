package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.learning.QuestionImportResponse;
import com.viettritutor.dto.learning.QuestionImportResponse.ImportedQuestion;
import com.viettritutor.enums.QuestionType;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HomeworkQuestionImportServiceTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-05T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    private final HomeworkQuestionImportService service = new HomeworkQuestionImportService(CLOCK);

    private static MockMultipartFile csv(String name, byte[] bytes) {
        return new MockMultipartFile("file", name, "text/csv", bytes);
    }

    private static MockMultipartFile csv(String text) {
        return csv("cau-hoi.csv", text.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("Reads multiple-choice and essay rows, letters map to options, points default to 1")
    void csv_basicRows() {
        QuestionImportResponse result = service.read(csv("""
                Câu hỏi,Loại,A,B,C,D,Đáp án,Điểm,publish_time
                "2 + 2 = ?",trắc nghiệm,3,4,5,,B,"1,5",2026-11-20 19:30
                Giải thích vì sao trời xanh,tự luận,,,,,,2,
                """));

        assertThat(result.errors()).isEmpty();
        assertThat(result.questions()).hasSize(2);
        ImportedQuestion mc = result.questions().get(0);
        assertThat(mc.type()).isEqualTo(QuestionType.MULTIPLE_CHOICE);
        assertThat(mc.options()).containsExactly("3", "4", "5");
        assertThat(mc.correctOption()).isEqualTo(1);
        assertThat(mc.points()).isEqualByComparingTo("1.5");
        ImportedQuestion essay = result.questions().get(1);
        assertThat(essay.type()).isEqualTo(QuestionType.ESSAY);
        assertThat(essay.options()).isNull();
        assertThat(essay.points()).isEqualByComparingTo("2");
        assertThat(result.publishTime()).isEqualTo(OffsetDateTime.parse("2026-11-20T19:30+07:00"));
    }

    @Test
    @DisplayName("Rule D: an empty answer picks the option 'Tất cả các đáp án trên đều đúng'")
    void csv_ruleD() {
        QuestionImportResponse result = service.read(csv("""
                cau_hoi,A,B,C,D,dap_an
                Số nào là số chẵn?,2,4,6,Tất cả các đáp án trên đều đúng,
                Chọn đáp án đúng,x,y,z,tat ca dap an tren deu dung,tất cả
                Câu không có đáp án,x,y,z,w,
                """));

        assertThat(result.questions()).hasSize(2);
        assertThat(result.questions().get(0).correctOption()).isEqualTo(3);
        assertThat(result.questions().get(0).answerDetected()).isTrue();
        assertThat(result.questions().get(1).correctOption()).isEqualTo(3);
        assertThat(result.questions().get(1).answerDetected()).isFalse();
        assertThat(result.errors()).singleElement().satisfies(e -> {
            assertThat(e.row()).isEqualTo(4);
            assertThat(e.message()).contains("Thiếu đáp án");
        });
    }

    @Test
    @DisplayName("Semicolon CSV with BOM, quoted commas and a line break inside a quoted cell")
    void csv_semicolonBomQuotes() {
        byte[] body = "cau_hoi;A;B;dap_an\n\"Dòng 1\nDòng 2, có dấu phẩy\";\"Có \"\"ngoặc\"\"\";Không;A\n".getBytes(StandardCharsets.UTF_8);
        byte[] withBom = new byte[body.length + 3];
        withBom[0] = (byte) 0xEF; withBom[1] = (byte) 0xBB; withBom[2] = (byte) 0xBF;
        System.arraycopy(body, 0, withBom, 3, body.length);

        QuestionImportResponse result = service.read(csv("q.csv", withBom));

        assertThat(result.errors()).isEmpty();
        assertThat(result.questions()).singleElement().satisfies(q -> {
            assertThat(q.prompt()).isEqualTo("Dòng 1\nDòng 2, có dấu phẩy");
            assertThat(q.options()).containsExactly("Có \"ngoặc\"", "Không");
            assertThat(q.correctOption()).isZero();
        });
    }

    @Test
    @DisplayName("A CSV saved by Excel in the Vietnamese Windows code page is still read")
    void csv_windows1258() {
        // windows-1258 has "à" and "ô" precomposed but writes the tone of "ộ" as a combining dot below.
        byte[] bytes = "cau_hoi,A,B,dap_an\nThu do Viet Nam,Hà N\u00f4\u0323i,Hue,A\n".getBytes(Charset.forName("windows-1258"));
        assertThat(new String(bytes, StandardCharsets.ISO_8859_1)).doesNotContain("?");
        QuestionImportResponse result = service.read(csv("q.csv", bytes));
        assertThat(result.errors()).isEmpty();
        assertThat(result.questions().getFirst().options().getFirst()).isEqualTo("Hà Nội");
    }

    @Test
    @DisplayName("Row errors are reported with the spreadsheet row number and do not stop other rows")
    void csv_rowErrors() {
        QuestionImportResponse result = service.read(csv("""
                cau_hoi,A,B,C,dap_an,diem
                ,1,2,,A,1
                Chỉ một phương án,1,,,A,1
                Đáp án trỏ vào ô trống,1,2,,C,1
                Đáp án lạ,1,2,,Z,1
                Điểm âm,1,2,,A,-1
                Hợp lệ,1,2,,B,1
                """));

        assertThat(result.questions()).hasSize(1);
        assertThat(result.errors()).extracting(QuestionImportResponse.RowError::row).containsExactly(2, 3, 4, 5, 6);
        assertThat(result.errors().get(2).message()).contains("trống");
    }

    @Test
    @DisplayName("Different publish_time values in one file are rejected")
    void csv_conflictingPublishTimes() {
        QuestionImportResponse result = service.read(csv("""
                cau_hoi,A,B,dap_an,publish_time
                Q1,1,2,A,2026-11-20 19:30
                Q2,1,2,A,21/11/2026 19:30
                """));
        assertThat(result.publishTime()).isNull();
        assertThat(result.errors()).anyMatch(e -> e.message().contains("publish_time khác nhau"));
    }

    @Test
    @DisplayName("Missing question column, unsupported type, empty or oversized files are rejected")
    void invalidFiles() {
        assertThatThrownBy(() -> service.read(csv("A,B\n1,2\n")))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_QUESTION_IMPORT);
        assertThatThrownBy(() -> service.read(new MockMultipartFile("file", "q.pdf", "application/pdf", new byte[]{1})))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.read(new MockMultipartFile("file", "q.csv", "text/csv", new byte[0])))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.read(csv("q.csv", new byte[(int) HomeworkQuestionImportService.MAX_BYTES + 1])))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.read(new MockMultipartFile("file", "q.xlsx", "application/octet-stream", "not excel".getBytes())))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("XLSX: first sheet, numeric cells and a real date cell for publish_time")
    void xlsx_withDateCell() throws Exception {
        byte[] bytes;
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Câu hỏi");
            String[] header = {"Câu hỏi", "A", "B", "C", "D", "Đáp án", "Điểm", "publish_time"};
            Row h = sheet.createRow(0);
            for (int i = 0; i < header.length; i++) h.createCell(i).setCellValue(header[i]);
            Row r = sheet.createRow(1);
            r.createCell(0).setCellValue("Số nguyên tố nhỏ nhất?");
            r.createCell(1).setCellValue(1);
            r.createCell(2).setCellValue(2);
            r.createCell(3).setCellValue(3);
            r.createCell(4).setCellValue("Tất cả các đáp án trên đều đúng");
            r.createCell(5).setCellValue("B");
            r.createCell(6).setCellValue(2);
            Cell when = r.createCell(7);
            when.setCellValue(LocalDateTime.of(2026, 11, 20, 19, 30));
            CellStyle style = wb.createCellStyle();
            style.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy hh:mm"));
            when.setCellStyle(style);
            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue("Câu D tự nhận");
            r2.createCell(1).setCellValue("a");
            r2.createCell(2).setCellValue("b");
            r2.createCell(3).setCellValue("c");
            r2.createCell(4).setCellValue("Tất cả các đáp án trên đều đúng");
            wb.write(out);
            bytes = out.toByteArray();
        }

        QuestionImportResponse result = service.read(new MockMultipartFile("file", "cau-hoi.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes));

        assertThat(result.errors()).isEmpty();
        assertThat(result.questions()).hasSize(2);
        assertThat(result.questions().get(0).options()).containsExactly("1", "2", "3", "Tất cả các đáp án trên đều đúng");
        assertThat(result.questions().get(0).correctOption()).isEqualTo(1);
        assertThat(result.questions().get(0).points()).isEqualByComparingTo(new BigDecimal("2"));
        assertThat(result.questions().get(1).correctOption()).isEqualTo(3);
        assertThat(result.publishTime()).isEqualTo(OffsetDateTime.parse("2026-11-20T19:30+07:00"));
    }

    @Test
    @DisplayName("'All of the above' detection prefers option D and ignores unrelated text")
    void allCorrectDetection() {
        assertThat(HomeworkQuestionImportService.isAllCorrect("Tất cả các đáp án trên đều đúng")).isTrue();
        assertThat(HomeworkQuestionImportService.isAllCorrect("TẤT CẢ ĐỀU ĐÚNG")).isTrue();
        assertThat(HomeworkQuestionImportService.isAllCorrect("All of the above")).isTrue();
        assertThat(HomeworkQuestionImportService.isAllCorrect("Tất cả học sinh")).isFalse();
        assertThat(HomeworkQuestionImportService.allCorrectIndex(List.of("a", "b", "c", "Tất cả đều đúng", "Tất cả các đáp án trên"))).isEqualTo(3);
        assertThat(HomeworkQuestionImportService.allCorrectIndex(List.of("a", "b"))).isEqualTo(-1);
    }

    // ── Word ────────────────────────────────────────────────────────────────

    private static MockMultipartFile docx(String name, String... paragraphs) throws Exception {
        try (org.apache.poi.xwpf.usermodel.XWPFDocument doc = new org.apache.poi.xwpf.usermodel.XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (String text : paragraphs) doc.createParagraph().createRun().setText(text);
            doc.write(out);
            return new MockMultipartFile("file", name, "application/octet-stream", out.toByteArray());
        }
    }

    @Test
    @DisplayName("Word free text: 'Câu n', options on one or many lines, '*' or 'Đáp án' marks the answer, brackets give type and points")
    void docx_freeText() throws Exception {
        QuestionImportResponse result = service.read(docx("de.docx",
                "ĐỀ KIỂM TRA 15 PHÚT",
                "Giờ mở bài: 2026-11-20 19:30",
                "Câu 1 (1,5 điểm): 2 + 2 = ?",
                "A. 3    B. 4    C. 5",
                "Đáp án: B",
                "Câu 2. Số nào là số chẵn?",
                "A. 2",
                "B. 4",
                "*C. 6",
                "Câu 3 (tự luận, 2đ): Trình bày cách giải",
                "a) Phương trình bậc nhất",
                "Câu 4: Chọn đúng",
                "A. x",
                "B. y",
                "C. z",
                "D. Tất cả các đáp án trên đều đúng"));

        assertThat(result.errors()).isEmpty();
        assertThat(result.questions()).hasSize(4);
        ImportedQuestion q1 = result.questions().get(0);
        assertThat(q1.prompt()).isEqualTo("2 + 2 = ?");
        assertThat(q1.options()).containsExactly("3", "4", "5");
        assertThat(q1.correctOption()).isEqualTo(1);
        assertThat(q1.points()).isEqualByComparingTo("1.5");
        assertThat(result.questions().get(1).correctOption()).isEqualTo(2);
        ImportedQuestion essay = result.questions().get(2);
        assertThat(essay.type()).isEqualTo(QuestionType.ESSAY);
        assertThat(essay.prompt()).isEqualTo("Trình bày cách giải\na) Phương trình bậc nhất");
        assertThat(essay.points()).isEqualByComparingTo("2");
        assertThat(result.questions().get(3).correctOption()).isEqualTo(3);
        assertThat(result.questions().get(3).answerDetected()).isTrue();
        assertThat(result.publishTime()).isEqualTo(OffsetDateTime.parse("2026-11-20T19:30+07:00"));
    }

    @Test
    @DisplayName("Word free text: errors name the question ('Câu 2'), not a row number")
    void docx_errorLabels() throws Exception {
        QuestionImportResponse result = service.read(docx("de.docx",
                "Câu 1: ok?", "A. có", "B. không", "Đáp án: A",
                "Câu 2: thiếu đáp án", "A. một", "B. hai"));

        assertThat(result.errors()).singleElement().satisfies(error -> {
            assertThat(error.label()).isEqualTo("Câu 2");
            assertThat(error.message()).contains("đáp án");
        });
    }

    @Test
    @DisplayName("Word table with the spreadsheet header is read like a spreadsheet")
    void docx_table() throws Exception {
        byte[] bytes;
        try (org.apache.poi.xwpf.usermodel.XWPFDocument doc = new org.apache.poi.xwpf.usermodel.XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.createParagraph().createRun().setText("Bảng câu hỏi");
            org.apache.poi.xwpf.usermodel.XWPFTable table = doc.createTable(2, 5);
            String[][] cells = {{"cau_hoi", "A", "B", "dap_an", "diem"}, {"1 + 1 = ?", "1", "2", "B", "3"}};
            for (int r = 0; r < 2; r++) for (int c = 0; c < 5; c++) table.getRow(r).getCell(c).setText(cells[r][c]);
            doc.write(out);
            bytes = out.toByteArray();
        }

        QuestionImportResponse result = service.read(new MockMultipartFile("file", "bang.docx", "application/octet-stream", bytes));

        assertThat(result.errors()).isEmpty();
        assertThat(result.questions()).singleElement().satisfies(q -> {
            assertThat(q.options()).containsExactly("1", "2");
            assertThat(q.correctOption()).isEqualTo(1);
            assertThat(q.points()).isEqualByComparingTo("3");
        });
    }

    @Test
    @DisplayName("A Word file without any 'Câu n' is rejected with a hint")
    void docx_noQuestions() throws Exception {
        MockMultipartFile file = docx("trong.docx", "Chỉ có tiêu đề");
        assertThatThrownBy(() -> service.read(file)).isInstanceOf(BusinessException.class).hasMessageContaining("Câu 1");
    }

    @Test
    @DisplayName("The downloadable Excel and Word templates read back without errors")
    void templates_roundTrip() {
        HomeworkQuestionTemplateService templates = new HomeworkQuestionTemplateService();
        QuestionImportResponse xlsx = service.read(new MockMultipartFile("file", "mau.xlsx", "application/octet-stream", templates.xlsx()));
        QuestionImportResponse docx = service.read(new MockMultipartFile("file", "mau.docx", "application/octet-stream", templates.docx()));

        for (QuestionImportResponse result : List.of(xlsx, docx)) {
            assertThat(result.errors()).isEmpty();
            assertThat(result.questions()).hasSize(4);
            assertThat(result.questions().get(0).correctOption()).isEqualTo(1);
            assertThat(result.questions().get(1).answerDetected()).isTrue();
            assertThat(result.questions().get(2).type()).isEqualTo(QuestionType.ESSAY);
            assertThat(result.questions().get(3).correctOptions()).containsExactly(0, 2);
            assertThat(result.publishTime()).isEqualTo(OffsetDateTime.parse("2026-12-01T19:30+07:00"));
        }
    }

    @Test
    @DisplayName("Word exam download: headings, options side by side, answer key table + '1C 2D' line at the end, parts restart numbering")
    void docx_examWithAnswerKey() throws Exception {
        byte[] bytes;
        try (org.apache.poi.xwpf.usermodel.XWPFDocument doc = new org.apache.poi.xwpf.usermodel.XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (String text : List.of(
                    "BÀI TẬP ĐIỆN TRƯỜNG. CƯỜNG ĐỘ ĐIỆN TRƯỜNG CÓ ĐÁP ÁN",
                    "PHẦN A. TRẮC NGHIỆM ĐỊNH TÍNH",
                    "Câu 1.  Điện trường là",
                    "A. môi trường không khí quanh điện tích.",
                    "B. môi trường chứa các điện tích.",
                    "C. môi trường bao quanh điện tích, gắn với điện tích và tác dụng lực điện lên các điện tích khác đặt trong nó.",
                    "D. môi trường dẫn điện.",
                    "Câu 2. Cường độ điện trường là đại lượng",
                    "A. véctơ\tB. vô hướng, có giá trị dương.",
                    "C. vô hướng, có giá trị dương hoặc âm.\tD. vectơ, có chiều luôn hướng vào điện tích.",
                    "PHẦN B. TRẮC NGHIỆM ĐỊNH LƯỢNG",
                    "Câu 1. Một điện tích q = 1 µC đặt trong chân không. Cường độ điện trường tại điểm cách nó 1 m là",
                    "A. 9000 V/m\tB. 900 V/m\tC. 90 V/m\tD. 9 V/m",
                    "ĐÁP ÁN")) {
                doc.createParagraph().createRun().setText(text);
            }
            org.apache.poi.xwpf.usermodel.XWPFTable key = doc.createTable(2, 3);
            String[][] cells = {{"Câu", "1", "2"}, {"Đáp án", "C", "A"}};
            for (int r = 0; r < 2; r++) for (int c = 0; c < 3; c++) key.getRow(r).getCell(c).setText(cells[r][c]);
            doc.createParagraph().createRun().setText("1A");
            doc.createParagraph().createRun().setText("Câu 1. Hướng dẫn: E = k|q|/r² = 9.10^9 . 10^-6 / 1 = 9000 V/m, I = 2 A. Chọn A");
            doc.write(out);
            bytes = out.toByteArray();
        }

        QuestionImportResponse result = service.read(new MockMultipartFile("file", "de.docx", "application/octet-stream", bytes));

        assertThat(result.errors()).isEmpty();
        assertThat(result.questions()).hasSize(3);
        assertThat(result.questions().get(0).options()).hasSize(4);
        assertThat(result.questions().get(0).options().get(3)).isEqualTo("môi trường dẫn điện.");
        assertThat(result.questions().get(0).correctOption()).isEqualTo(2);
        assertThat(result.questions().get(1).options()).containsExactly("véctơ", "vô hướng, có giá trị dương.",
                "vô hướng, có giá trị dương hoặc âm.", "vectơ, có chiều luôn hướng vào điện tích.");
        assertThat(result.questions().get(1).correctOption()).isZero();
        assertThat(result.questions().get(2).correctOption()).isZero();
    }

    @Test
    @DisplayName("Word: a red or underlined option letter marks the answer")
    void docx_markedOption() throws Exception {
        byte[] bytes;
        try (org.apache.poi.xwpf.usermodel.XWPFDocument doc = new org.apache.poi.xwpf.usermodel.XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.createParagraph().createRun().setText("Câu 1. 1 + 1 = ?");
            doc.createParagraph().createRun().setText("A. 1");
            org.apache.poi.xwpf.usermodel.XWPFParagraph p = doc.createParagraph();
            org.apache.poi.xwpf.usermodel.XWPFRun letter = p.createRun();
            letter.setText("B.");
            letter.setColor("FF0000");
            p.createRun().setText(" 2");
            doc.write(out);
            bytes = out.toByteArray();
        }
        QuestionImportResponse result = service.read(new MockMultipartFile("file", "de.docx", "application/octet-stream", bytes));
        assertThat(result.errors()).isEmpty();
        assertThat(result.questions().get(0).options()).containsExactly("1", "2");
        assertThat(result.questions().get(0).correctOption()).isEqualTo(1);
    }

    @Test
    @DisplayName("Word without answers: the error names the question and says how to add one")
    void docx_missingAnswerHint() throws Exception {
        QuestionImportResponse result = service.read(docx("de.docx", "Câu 1. Hỏi?", "A. x", "B. y"));
        assertThat(result.errors()).singleElement().satisfies(error -> {
            assertThat(error.label()).isEqualTo("Câu 1");
            assertThat(error.message()).contains("bảng đáp án");
        });
    }

    @Test
    @DisplayName("Multi-answer: 'A, C' / 'AC' / 'A và C' in a sheet, several '*' marks or 'Đáp án: B, D' in Word, '3AC' in a key")
    void multipleCorrectOptions() throws Exception {
        QuestionImportResponse sheet = service.read(csv("""
                cau_hoi,A,B,C,D,dap_an
                Q1,a,b,c,d,"A, C"
                Q2,a,b,c,d,BD
                Q3,a,b,c,d,A và D
                Q4,a,b,c,d,A
                Q5,a,b,c,d,A1
                """));
        assertThat(sheet.questions()).hasSize(4);
        assertThat(sheet.questions().get(0).correctOptions()).containsExactly(0, 2);
        assertThat(sheet.questions().get(0).correctOption()).isZero();
        assertThat(sheet.questions().get(1).correctOptions()).containsExactly(1, 3);
        assertThat(sheet.questions().get(2).correctOptions()).containsExactly(0, 3);
        assertThat(sheet.questions().get(3).correctOptions()).containsExactly(0);
        assertThat(sheet.errors()).singleElement().satisfies(error -> assertThat(error.row()).isEqualTo(6));

        QuestionImportResponse word = service.read(docx("de.docx",
                "Câu 1: Chọn hai", "*A. x", "B. y", "*C. z",
                "Câu 2: Chọn hai", "A. x    B. y    C. z    D. t", "Đáp án: B, D",
                "Câu 3: Chọn hai", "A. x", "B. y", "C. z",
                "ĐÁP ÁN", "3AC"));
        assertThat(word.errors()).isEmpty();
        assertThat(word.questions().get(0).correctOptions()).containsExactly(0, 2);
        assertThat(word.questions().get(1).correctOptions()).containsExactly(1, 3);
        assertThat(word.questions().get(2).correctOptions()).containsExactly(0, 2);
    }
}
