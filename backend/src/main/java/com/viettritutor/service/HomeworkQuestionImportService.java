package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.learning.QuestionImportResponse;
import com.viettritutor.dto.learning.QuestionImportResponse.ImportedQuestion;
import com.viettritutor.dto.learning.QuestionImportResponse.RowError;
import com.viettritutor.enums.QuestionType;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.text.Normalizer;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * HW-02: reads quiz questions from a .csv / .xlsx file (one question per row) or a Word file (.docx / .doc, see
 * {@link WordQuestionReader}) without saving anything.
 * Columns are matched by header, with or without Vietnamese accents: cau_hoi, loai, A..J, dap_an, diem, publish_time.
 * Rule D: a multiple-choice row with an empty dap_an whose option reads "Tất cả các đáp án trên đều đúng"
 * gets that option as the correct answer.
 */
@Service
@RequiredArgsConstructor
public class HomeworkQuestionImportService {
    static final long MAX_BYTES = 2L * 1024 * 1024;
    static final int MAX_QUESTIONS = 100;
    private static final String LETTERS = "ABCDEFGHIJ";
    private static final List<DateTimeFormatter> LOCAL_FORMATS = List.of(
            DateTimeFormatter.ofPattern("yyyy-MM-dd H:mm[:ss]"), DateTimeFormatter.ofPattern("yyyy-MM-dd'T'H:mm[:ss]"),
            DateTimeFormatter.ofPattern("d/M/yyyy H:mm[:ss]"), DateTimeFormatter.ofPattern("d-M-yyyy H:mm[:ss]"));

    private final Clock clock;

    public QuestionImportResponse read(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES)
            throw new BusinessException(ErrorCode.INVALID_QUESTION_IMPORT);
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        List<List<Cell2>> rows;
        List<String> labels = null;
        try {
            byte[] bytes = file.getBytes();
            if (name.endsWith(".csv")) rows = csvRows(decode(bytes));
            else if (name.endsWith(".xlsx") || name.endsWith(".xls")) rows = sheetRows(bytes);
            else if (name.endsWith(".docx") || name.endsWith(".doc")) {
                WordQuestionReader.Result word = name.endsWith(".docx") ? WordQuestionReader.docx(bytes) : WordQuestionReader.doc(bytes);
                if (word.labels() != null && word.rows().size() <= 1)
                    throw new BusinessException(ErrorCode.INVALID_QUESTION_IMPORT,
                            "Không thấy câu hỏi trong file Word. Mỗi câu bắt đầu bằng \"Câu 1:\", phương án \"A. …\", dòng \"Đáp án: B\" — xem file mẫu Word");
                rows = word.rows();
                labels = word.labels();
            } else throw new BusinessException(ErrorCode.INVALID_QUESTION_IMPORT);
        } catch (IOException | RuntimeException ex) {
            if (ex instanceof BusinessException business) throw business;
            throw new BusinessException(ErrorCode.INVALID_QUESTION_IMPORT, "Không đọc được file. Hãy dùng file mẫu Word (.docx), Excel (.xlsx) hoặc .csv");
        }
        QuestionImportResponse result = parse(rows);
        if (labels == null) return result;
        List<String> rowLabels = labels;
        List<RowError> errors = result.errors().stream()
                .map(error -> new RowError(error.row(),
                        error.message().startsWith("Thiếu đáp án đúng")
                                ? "Thiếu đáp án đúng — thêm dòng \"Đáp án: B\" dưới câu, đánh dấu \"*B.\" hoặc thêm bảng đáp án (\"1C 2B …\") cuối file"
                                : error.message(),
                        error.row() - 1 < rowLabels.size() ? rowLabels.get(error.row() - 1) : null))
                .toList();
        return new QuestionImportResponse(result.questions(), result.publishTime(), errors);
    }

    /** A cell's text, plus its date value when the spreadsheet stored a real date. */
    record Cell2(String text, LocalDateTime date) {
        static Cell2 of(String text) { return new Cell2(text == null ? "" : text.trim(), null); }
    }

    QuestionImportResponse parse(List<List<Cell2>> rows) {
        int headerAt = -1;
        for (int i = 0; i < rows.size() && headerAt < 0; i++)
            if (rows.get(i).stream().anyMatch(c -> !c.text().isEmpty())) headerAt = i;
        if (headerAt < 0) throw new BusinessException(ErrorCode.INVALID_QUESTION_IMPORT, "File không có dữ liệu");
        Map<String, Integer> col = new HashMap<>();
        Integer[] optionCol = new Integer[LETTERS.length()];
        List<Cell2> header = rows.get(headerAt);
        for (int c = 0; c < header.size(); c++) {
            String key = column(header.get(c).text());
            if (key == null) continue;
            if (key.startsWith("option:")) optionCol[LETTERS.indexOf(key.charAt(7))] = c;
            else col.putIfAbsent(key, c);
        }
        if (!col.containsKey("prompt"))
            throw new BusinessException(ErrorCode.INVALID_QUESTION_IMPORT, "Thiếu cột câu hỏi (cau_hoi)");

        List<ImportedQuestion> questions = new ArrayList<>();
        List<RowError> errors = new ArrayList<>();
        Set<OffsetDateTime> publishTimes = new LinkedHashSet<>();
        for (int r = headerAt + 1; r < rows.size(); r++) {
            List<Cell2> row = rows.get(r);
            int rowNo = r + 1;
            if (row.stream().allMatch(c -> c.text().isEmpty() && c.date() == null)) continue;
            if (col.containsKey("publish")) {
                Cell2 when = at(row, col.get("publish"));
                if (!when.text().isEmpty() || when.date() != null) {
                    try { publishTimes.add(publishTime(when)); }
                    catch (DateTimeParseException ex) { errors.add(new RowError(rowNo, "publish_time không đúng định dạng (vd 2026-11-20 19:30)")); }
                }
            }
            try {
                questions.add(question(row, col, optionCol));
            } catch (IllegalArgumentException ex) {
                errors.add(new RowError(rowNo, ex.getMessage()));
            }
        }
        if (questions.isEmpty() && errors.isEmpty()) errors.add(new RowError(headerAt + 1, "File không có câu hỏi nào"));
        if (questions.size() > MAX_QUESTIONS) errors.add(new RowError(headerAt + 1, "Tối đa " + MAX_QUESTIONS + " câu hỏi cho một bài"));
        if (publishTimes.size() > 1) errors.add(new RowError(headerAt + 1, "Các dòng có publish_time khác nhau; một bài chỉ có một giờ mở bài"));
        OffsetDateTime publish = publishTimes.size() == 1 ? publishTimes.iterator().next() : null;
        return new QuestionImportResponse(questions, publish, errors);
    }

    private ImportedQuestion question(List<Cell2> row, Map<String, Integer> col, Integer[] optionCol) {
        String prompt = text(row, col.get("prompt"));
        if (prompt.isEmpty()) throw new IllegalArgumentException("Thiếu nội dung câu hỏi");
        if (prompt.length() > 5000) throw new IllegalArgumentException("Câu hỏi dài quá 5000 ký tự");
        BigDecimal points = points(text(row, col.get("points")));
        // Filled options keep their column order; letters map from columns to the kept list.
        List<String> options = new ArrayList<>();
        Map<Integer, Integer> letterToIndex = new HashMap<>();
        for (int i = 0; i < optionCol.length; i++) {
            String option = text(row, optionCol[i]);
            if (option.isEmpty()) continue;
            if (option.length() > 1000) throw new IllegalArgumentException("Phương án " + LETTERS.charAt(i) + " dài quá 1000 ký tự");
            letterToIndex.put(i, options.size());
            options.add(option);
        }
        QuestionType type = type(text(row, col.get("type")), options);
        if (type == QuestionType.ESSAY) {
            if (!options.isEmpty()) throw new IllegalArgumentException("Câu tự luận không có phương án A, B, C…");
            return new ImportedQuestion(type, prompt, null, null, points, false);
        }
        if (options.size() < 2) throw new IllegalArgumentException("Câu trắc nghiệm cần ít nhất 2 phương án");
        String answer = text(row, col.get("answer"));
        int allIndex = allCorrectIndex(options);
        if (answer.isEmpty()) {
            if (allIndex < 0) throw new IllegalArgumentException("Thiếu đáp án đúng (cột dap_an)");
            return new ImportedQuestion(type, prompt, options, allIndex, points, true);
        }
        String a = plain(answer);
        if (a.equals("tat ca") || a.equals("all")) {
            if (allIndex < 0) throw new IllegalArgumentException("Đáp án là \"tất cả\" nhưng không có phương án \"Tất cả các đáp án trên đều đúng\"");
            return new ImportedQuestion(type, prompt, options, allIndex, points, false);
        }
        int letter = a.length() == 1 ? LETTERS.indexOf(Character.toUpperCase(a.charAt(0)))
                : a.matches("\\d{1,2}") ? Integer.parseInt(a) - 1 : -1;
        if (letter < 0 || letter >= LETTERS.length()) throw new IllegalArgumentException("Đáp án \"" + answer + "\" phải là một chữ A–J");
        Integer index = letterToIndex.get(letter);
        if (index == null) throw new IllegalArgumentException("Đáp án " + LETTERS.charAt(letter) + " trỏ tới phương án đang để trống");
        return new ImportedQuestion(type, prompt, options, index, points, false);
    }

    /** Index of the "all of the above" option, preferring D; -1 when there is none. */
    static int allCorrectIndex(List<String> options) {
        if (options.size() > 3 && isAllCorrect(options.get(3))) return 3;
        for (int i = options.size() - 1; i >= 0; i--) if (isAllCorrect(options.get(i))) return i;
        return -1;
    }

    static boolean isAllCorrect(String option) {
        String p = plain(option);
        return p.contains("all of the above") || (p.contains("tat ca") && (p.contains("dung") || p.contains("tren")));
    }

    private static QuestionType type(String raw, List<String> options) {
        String t = plain(raw);
        if (t.isEmpty()) return options.isEmpty() ? QuestionType.ESSAY : QuestionType.MULTIPLE_CHOICE;
        if (Set.of("trac nghiem", "tn", "multiple choice", "multiple_choice", "mc").contains(t)) return QuestionType.MULTIPLE_CHOICE;
        if (Set.of("tu luan", "tl", "essay").contains(t)) return QuestionType.ESSAY;
        throw new IllegalArgumentException("Loại câu \"" + raw + "\" phải là trắc nghiệm hoặc tự luận");
    }

    private static BigDecimal points(String raw) {
        if (raw.isEmpty()) return BigDecimal.ONE;
        try {
            BigDecimal value = new BigDecimal(raw.replace(',', '.')).stripTrailingZeros();
            if (value.signum() <= 0 || value.scale() > 2 || value.precision() - value.scale() > 8) throw new NumberFormatException();
            return value.scale() < 0 ? value.setScale(0) : value;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Điểm \"" + raw + "\" phải là số dương, tối đa 2 chữ số thập phân");
        }
    }

    private OffsetDateTime publishTime(Cell2 cell) {
        if (cell.date() != null) return cell.date().atZone(clock.getZone()).toOffsetDateTime();
        String raw = cell.text();
        try { return OffsetDateTime.parse(raw); } catch (DateTimeParseException ignored) { /* local time below */ }
        for (DateTimeFormatter format : LOCAL_FORMATS) {
            try { return LocalDateTime.parse(raw, format).atZone(clock.getZone()).toOffsetDateTime(); }
            catch (DateTimeParseException ignored) { /* try next format */ }
        }
        throw new DateTimeParseException("Unsupported publish_time", raw, 0);
    }

    /** Header text → logical column: prompt, type, answer, points, publish or option:A..J. */
    static String column(String header) {
        String h = plain(header).replace(' ', '_');
        if (h.isEmpty()) return null;
        if (Set.of("cau_hoi", "noi_dung", "noi_dung_cau_hoi", "question", "prompt").contains(h)) return "prompt";
        if (Set.of("loai", "loai_cau", "loai_cau_hoi", "type").contains(h)) return "type";
        if (Set.of("dap_an", "dap_an_dung", "answer", "correct", "correct_answer").contains(h)) return "answer";
        if (Set.of("diem", "so_diem", "points", "score").contains(h)) return "points";
        if (Set.of("publish_time", "thoi_gian_mo_bai", "gio_mo_bai", "mo_bai_luc", "open_at").contains(h)) return "publish";
        String letter = h.replaceFirst("^(phuong_an|dap_an|option)_", "");
        if (letter.length() == 1 && LETTERS.indexOf(Character.toUpperCase(letter.charAt(0))) >= 0)
            return "option:" + Character.toUpperCase(letter.charAt(0));
        return null;
    }

    /** Lower case, no Vietnamese accents, single spaces. */
    static String plain(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT);
        return n.replaceAll("[^a-z0-9_]+", " ").trim().replaceAll("\\s+", " ");
    }

    private static Cell2 at(List<Cell2> row, Integer c) {
        return c == null || c >= row.size() ? Cell2.of("") : row.get(c);
    }

    private static String text(List<Cell2> row, Integer c) {
        return at(row, c).text();
    }

    /** UTF-8 (with or without BOM); otherwise the Vietnamese Windows code page Excel uses for plain CSV. */
    static String decode(byte[] bytes) throws CharacterCodingException {
        int start = bytes.length >= 3 && (bytes[0] & 0xff) == 0xEF && (bytes[1] & 0xff) == 0xBB && (bytes[2] & 0xff) == 0xBF ? 3 : 0;
        ByteBuffer buffer = ByteBuffer.wrap(bytes, start, bytes.length - start);
        try {
            return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(buffer).toString();
        } catch (CharacterCodingException ex) {
            // windows-1258 writes Vietnamese as base letter + combining mark; compose it back.
            String text = Charset.forName("windows-1258").decode(ByteBuffer.wrap(bytes, start, bytes.length - start)).toString();
            return Normalizer.normalize(text, Normalizer.Form.NFC);
        }
    }

    /** RFC 4180 CSV with quoted fields; the delimiter (, ; or tab) is taken from the first line. */
    static List<List<Cell2>> csvRows(String text) {
        String firstLine = text.lines().findFirst().orElse("");
        char delimiter = ',';
        long commas = firstLine.chars().filter(ch -> ch == ',').count();
        if (firstLine.chars().filter(ch -> ch == ';').count() > commas) delimiter = ';';
        else if (firstLine.chars().filter(ch -> ch == '\t').count() > commas) delimiter = '\t';
        List<List<Cell2>> rows = new ArrayList<>();
        List<Cell2> row = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (quoted) {
                if (ch == '"' && i + 1 < text.length() && text.charAt(i + 1) == '"') { cell.append('"'); i++; }
                else if (ch == '"') quoted = false;
                else cell.append(ch);
            } else if (ch == '"' && cell.isEmpty()) {
                quoted = true;
            } else if (ch == delimiter) {
                row.add(Cell2.of(cell.toString())); cell.setLength(0);
            } else if (ch == '\n' || ch == '\r') {
                if (ch == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') i++;
                row.add(Cell2.of(cell.toString())); cell.setLength(0);
                rows.add(row); row = new ArrayList<>();
            } else {
                cell.append(ch);
            }
        }
        if (!cell.isEmpty() || !row.isEmpty()) { row.add(Cell2.of(cell.toString())); rows.add(row); }
        return rows;
    }

    /** First sheet of a workbook; date cells keep their date so publish_time is exact. */
    static List<List<Cell2>> sheetRows(byte[] bytes) throws IOException {
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter(Locale.ROOT);
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();
            List<List<Cell2>> rows = new ArrayList<>();
            for (int r = 0; r <= sheet.getLastRowNum() && r <= MAX_QUESTIONS + 50; r++) {
                Row source = sheet.getRow(r);
                List<Cell2> row = new ArrayList<>();
                if (source != null) {
                    for (int c = 0; c < Math.max(0, source.getLastCellNum()); c++) {
                        Cell cell = source.getCell(c);
                        if (cell == null) { row.add(Cell2.of("")); continue; }
                        boolean date = cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell);
                        row.add(new Cell2(formatter.formatCellValue(cell, evaluator).trim(), date ? cell.getLocalDateTimeCellValue() : null));
                    }
                }
                rows.add(row);
            }
            return rows;
        }
    }
}
