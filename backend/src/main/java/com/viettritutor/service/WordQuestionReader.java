package com.viettritutor.service;

import com.viettritutor.service.HomeworkQuestionImportService.Cell2;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.hwpf.usermodel.Paragraph;
import org.apache.poi.hwpf.usermodel.Range;
import org.apache.poi.hwpf.usermodel.Table;
import org.apache.poi.hwpf.usermodel.TableRow;
import org.apache.poi.xwpf.usermodel.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * HW-02: turns a Word file (.docx or .doc) into the same rows a spreadsheet gives, so one parser handles every format.
 * <ul>
 *   <li>A table whose first row has a question header (cau_hoi…) is read like a spreadsheet.</li>
 *   <li>Otherwise the text is read the way exams are usually typed (and downloaded from exam sites):
 *   <pre>
 *   PHẦN A. TRẮC NGHIỆM                       ← headings end the previous question
 *   Câu 1 (1 điểm): 2 + 3 bằng bao nhiêu?
 *   A. 4    B. 5    C. 6    D. 7              ← one per line, several per line or in a layout table
 *   Đáp án: B   |  *B. 5  |  Chọn B           ← per question, or …
 *   ĐÁP ÁN                                    ← … an answer key at the end: "1C 2B 3-D", "Câu 1: C" or a
 *   1 | 2 | 3                                    table of numbers over letters
 *   C | B | D
 *   </pre>
 *   Lines after "Hướng dẫn giải" / "Lời giải" are skipped apart from "Chọn C". Numbering that restarts (PHẦN B,
 *   Câu 1 again) starts a new part, and answer keys fill the parts in order. In .docx an underlined or red option
 *   letter also marks the answer, and Word's automatic numbering ("Câu 1.", "A.") is rebuilt.</li>
 * </ul>
 */
final class WordQuestionReader {
    private WordQuestionReader() {}

    /** Rows for the parser; labels (by row index) name each row for error messages, or null for a table. */
    record Result(List<List<Cell2>> rows, List<String> labels) {}

    /** A paragraph's text, or a table that is not a question table */
    private sealed interface Block permits Line, Grid {}
    private record Line(String text) implements Block {}
    private record Grid(List<List<String>> rows) implements Block {}

    private static final String LETTERS = "ABCDEFGHIJ";
    private static final List<String> HEADER = List.of("cau_hoi", "loai", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
            "dap_an", "diem", "publish_time");
    private static final int PROMPT = 0, TYPE = 1, FIRST_OPTION = 2, ANSWER = 12, POINTS = 13, PUBLISH = 14;
    private static final int FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;

    private static final Pattern QUESTION = Pattern.compile(
            "^(?:câu|cau|question|bài|bai)\\s*(\\d+)\\s*(?:\\(([^)]*)\\))?\\s*[:.)\\-–]?\\s*(.*)$", FLAGS | Pattern.DOTALL);
    /** An option marker: optional * (correct), an upper-case letter A–J, then "." or ")" */
    private static final Pattern OPTION = Pattern.compile("(?:^|\\s+)(\\*?)\\s*([A-J])\\s*[.)]\\s*");
    /** "2 điểm", "1,5đ", "0.5 diem" inside the brackets after "Câu n" */
    private static final Pattern POINTS_IN = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(?:điểm|diem|đ|d)(?!\\p{L})", FLAGS);
    /** "Chọn C", "Đáp án: C", "Đáp án đúng là C" inside a solution or on its own line */
    private static final Pattern CHOOSE = Pattern.compile("(?:chọn|chon|đáp án(?: đúng)?(?: là)?|dap an(?: dung)?(?: la)?)\\s*[:.]?\\s*([A-J])(?![\\p{L}\\d])", FLAGS);
    /** Answer-key entries: "1C", "1.C", "1-C", "1: C", "Câu 1: C", "Câu 1. Chọn C" */
    private static final Pattern KEY_ENTRY = Pattern.compile(
            "(?:câu|cau)?\\s*(\\d{1,3})\\s*[.:)\\-–]?\\s*(?:(?:chọn|chon|đáp án|dap an)\\s*:?\\s*)?([A-J])(?![\\p{L}\\d])", FLAGS);
    private static final Set<String> KEY_HEADINGS = Set.of("dap an", "bang dap an", "dap an tham khao", "dap an va huong dan giai",
            "dap an va loi giai", "huong dan giai", "huong dan giai chi tiet", "loi giai", "loi giai chi tiet", "key", "answer key",
            "answers", "bang dap an trac nghiem", "dap an trac nghiem", "dap an chi tiet");
    private static final Set<String> SOLUTION_KEYS = Set.of("huong dan", "huong dan giai", "hd", "hdg", "loi giai", "giai",
            "giai thich", "phuong phap", "cach giai");

    // ── Reading the file ────────────────────────────────────────────────────

    static Result docx(byte[] bytes) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            List<Block> blocks = new ArrayList<>();
            Numbering numbering = new Numbering();
            for (IBodyElement element : doc.getBodyElements()) {
                if (element instanceof XWPFTable table) {
                    List<List<String>> rows = new ArrayList<>();
                    for (XWPFTableRow row : table.getRows())
                        rows.add(row.getTableCells().stream().map(cell -> cellText(cell)).toList());
                    Result fromTable = table(rows);
                    if (fromTable != null) return fromTable;
                    blocks.add(new Grid(rows));
                } else if (element instanceof XWPFParagraph paragraph) {
                    blocks.add(new Line(numbering.prefix(paragraph) + markedText(paragraph)));
                }
            }
            return text(blocks);
        }
    }

    static Result doc(byte[] bytes) throws IOException {
        try (HWPFDocument doc = new HWPFDocument(new ByteArrayInputStream(bytes))) {
            Range range = doc.getRange();
            List<Block> blocks = new ArrayList<>();
            for (int i = 0; i < range.numParagraphs(); i++) {
                Paragraph paragraph = range.getParagraph(i);
                if (paragraph.isInTable()) {
                    Table table;
                    try { table = range.getTable(paragraph); }
                    catch (RuntimeException ex) { blocks.add(new Line(clean(paragraph.text()))); continue; }
                    List<List<String>> rows = new ArrayList<>();
                    for (int r = 0; r < table.numRows(); r++) {
                        TableRow row = table.getRow(r);
                        List<String> cells = new ArrayList<>();
                        for (int c = 0; c < row.numCells(); c++) cells.add(clean(row.getCell(c).text()));
                        rows.add(cells);
                    }
                    Result fromTable = table(rows);
                    if (fromTable != null) return fromTable;
                    blocks.add(new Grid(rows));
                    i += Math.max(0, table.numParagraphs() - 1);
                } else {
                    blocks.add(new Line(clean(paragraph.text())));
                }
            }
            return text(blocks);
        }
    }

    /** Word control characters: \r paragraph end, \u0007 cell end, \u000b line break; field codes stripped */
    private static String clean(String raw) {
        return WordExtractor.stripFields(raw).replace('\u000b', '\n').replaceAll("[\\r\\u0007\\f]", "").trim();
    }

    private static String cellText(XWPFTableCell cell) {
        StringBuilder out = new StringBuilder();
        for (XWPFParagraph paragraph : cell.getParagraphs()) {
            if (!out.isEmpty()) out.append('\n');
            out.append(markedText(paragraph));
        }
        return out.toString();
    }

    /**
     * Paragraph text where an underlined, red or highlighted run starting with an option letter ("C.") gets a "*",
     * the way many exam files show the correct answer. Ignored when the whole paragraph is formatted that way.
     */
    private static String markedText(XWPFParagraph paragraph) {
        List<XWPFRun> runs = paragraph.getRuns();
        boolean anyPlain = runs.stream().anyMatch(run -> !isMarked(run) && run.text() != null && !run.text().isBlank());
        if (!anyPlain) return paragraph.getText();
        StringBuilder out = new StringBuilder();
        for (XWPFRun run : runs) {
            String text = run.text();
            if (text == null) continue;
            if (isMarked(run) && text.strip().matches("^[A-J]\\s*[.)].*") ) {
                int at = text.indexOf(text.strip().charAt(0));
                out.append(text, 0, at).append('*').append(text.substring(at));
            } else out.append(text);
        }
        return out.toString();
    }

    private static boolean isMarked(XWPFRun run) {
        if (run.getUnderline() != null && run.getUnderline() != UnderlinePatterns.NONE) return true;
        if (run.isHighlighted()) return true;
        String color = run.getColor();
        if (color == null || color.length() != 6 || color.equalsIgnoreCase("auto")) return false;
        try {
            int r = Integer.parseInt(color.substring(0, 2), 16), g = Integer.parseInt(color.substring(2, 4), 16),
                    b = Integer.parseInt(color.substring(4, 6), 16);
            return r >= 0xB0 && g <= 0x50 && b <= 0x50;
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    /** A table whose first row is a question header, as spreadsheet rows; null when it is some other table */
    static Result table(List<List<String>> rows) {
        if (rows.isEmpty() || rows.get(0).stream().noneMatch(cell -> "prompt".equals(HomeworkQuestionImportService.column(cell))))
            return null;
        return new Result(rows.stream().map(row -> row.stream().map(Cell2::of).toList()).toList(), null);
    }

    // ── Free text ───────────────────────────────────────────────────────────

    /** Builds the question rows while reading the document top to bottom */
    private static final class Builder {
        final List<String[]> questions = new ArrayList<>();
        final List<Integer> numbers = new ArrayList<>();
        /** Index of the first question of each part (numbering restarts start a part) */
        final List<Integer> partStarts = new ArrayList<>();
        final List<String> publish = new ArrayList<>();
        String[] current;
        int lastOption = -1;
        boolean inSolution;
        boolean inKey;
        /** Part the answer key is filling, and the question numbers it already filled there */
        int keyPart = -1;
        final Set<Integer> keyed = new HashSet<>();

        void startQuestion(int number, String inside, String prompt) {
            if (numbers.isEmpty() || number <= numbers.get(numbers.size() - 1)) partStarts.add(questions.size());
            current = new String[HEADER.size()];
            Arrays.fill(current, "");
            questions.add(current);
            numbers.add(number);
            lastOption = -1;
            inSolution = false;
            current[PROMPT] = prompt.strip();
            if (inside != null && !details(inside, current)) current[PROMPT] = ("(" + inside + ") " + current[PROMPT]).strip();
        }

        void endQuestion() {
            current = null;
            inSolution = false;
        }

        void startKey() {
            endQuestion();
            if (!inKey) {
                inKey = true;
                keyPart = -1;
                keyed.clear();
            }
        }

        /** Answer-key entry: fills question `number` in the part the key is working through */
        void key(int number, String letter) {
            if (partStarts.isEmpty()) return;
            if (keyPart < 0) keyPart = firstUnkeyedPart();
            if (keyed.contains(number) && keyPart + 1 < partStarts.size()) { keyPart++; keyed.clear(); }
            keyed.add(number);
            int from = partStarts.get(keyPart);
            int to = keyPart + 1 < partStarts.size() ? partStarts.get(keyPart + 1) : questions.size();
            for (int i = from; i < to; i++) {
                if (numbers.get(i) == number) {
                    if (questions.get(i)[ANSWER].isEmpty()) questions.get(i)[ANSWER] = letter.toUpperCase(Locale.ROOT);
                    return;
                }
            }
        }

        private int firstUnkeyedPart() {
            for (int p = 0; p < partStarts.size(); p++) {
                int from = partStarts.get(p);
                int to = p + 1 < partStarts.size() ? partStarts.get(p + 1) : questions.size();
                boolean anyAnswer = false;
                for (int i = from; i < to; i++) if (!questions.get(i)[ANSWER].isEmpty()) anyAnswer = true;
                if (!anyAnswer) return p;
            }
            return 0;
        }

        /** Question whose worked solution is being read in the key section; -1 when none or already answered */
        int keyQuestion = -1;

        void keyOnce(String letter) {
            if (keyQuestion <= 0) return;
            key(keyQuestion, letter);
            keyQuestion = -1;
        }

        void keyText(String text) {
            Matcher m = KEY_ENTRY.matcher(text);
            while (m.find()) key(Integer.parseInt(m.group(1)), m.group(2));
        }
    }

    /** Reads "Câu 1: …" blocks into rows under a fixed header; returns no question rows when there are none */
    private static Result text(List<Block> blocks) {
        Builder b = new Builder();
        for (Block block : blocks) {
            if (block instanceof Grid grid) {
                if (b.inKey || looksLikeKey(grid.rows())) {
                    b.startKey();
                    keyTable(grid.rows(), b);
                } else {
                    // A layout table (options side by side, a question in a cell…): read it row by row as text
                    for (List<String> row : grid.rows()) line(String.join("    ", row), b);
                }
            } else if (block instanceof Line l) {
                line(l.text(), b);
            }
        }
        for (int i = 0; i < b.publish.size() && i < b.questions.size(); i++) b.questions.get(i)[PUBLISH] = b.publish.get(i);

        List<List<Cell2>> rows = new ArrayList<>();
        List<String> labels = new ArrayList<>();
        rows.add(HEADER.stream().map(Cell2::of).toList());
        labels.add("File");
        boolean manyParts = b.partStarts.size() > 1;
        for (int i = 0; i < b.questions.size(); i++) {
            rows.add(Arrays.stream(b.questions.get(i)).map(Cell2::of).toList());
            int part = 0;
            while (part + 1 < b.partStarts.size() && b.partStarts.get(part + 1) <= i) part++;
            labels.add((manyParts ? "Phần " + (part + 1) + ", câu " : "Câu ") + b.numbers.get(i));
        }
        return new Result(rows, labels);
    }

    private static void line(String raw, Builder b) {
        for (String line : Normalizer.normalize(raw == null ? "" : raw, Normalizer.Form.NFC).split("\\R")) {
            line = line.replace(' ', ' ').replace('\t', ' ').strip();
            if (line.isEmpty()) continue;
            String plain = HomeworkQuestionImportService.plain(line);

            String[] keyValue = keyValue(line);
            if (keyValue != null && keyValue[0].equals("publish")) { b.publish.add(keyValue[1]); continue; }

            if (KEY_HEADINGS.contains(plain) || (plain.startsWith("dap an") && plain.length() <= 40 && keyValue == null
                    && isHeading(line))) {
                b.startKey();
                continue;
            }
            if (b.inKey) {
                if (isHeading(line) && !plain.startsWith("dap an")) b.inKey = false; // a new section after the key
                else { keyLine(line, b); continue; }
            }

            Matcher q = QUESTION.matcher(line);
            if (q.matches()) {
                b.startQuestion(Integer.parseInt(q.group(1)), q.group(2), q.group(3));
                continue;
            }
            String[] current = b.current;

            if (current != null && !b.inSolution && !isEssay(current)) {
                List<String[]> options = options(line);
                if (options != null) {
                    for (String[] option : options) {
                        int index = LETTERS.indexOf(option[1].charAt(0));
                        current[FIRST_OPTION + index] = option[2];
                        if (!option[0].isEmpty()) current[ANSWER] = option[1];
                        b.lastOption = index;
                    }
                    continue;
                }
            }
            if (isHeading(line)) { b.endQuestion(); continue; } // PHẦN A…, DẠNG 2…, I. LÝ THUYẾT
            if (current == null) continue; // title, instructions… before the first question

            if (keyValue != null) {
                switch (keyValue[0]) {
                    case "answer" -> current[ANSWER] = answerLetter(keyValue[1]);
                    case "points" -> current[POINTS] = keyValue[1];
                    case "type" -> current[TYPE] = keyValue[1];
                    case "solution" -> {
                        b.inSolution = true;
                        Matcher choose = CHOOSE.matcher(keyValue[1]);
                        if (choose.find() && current[ANSWER].isEmpty()) current[ANSWER] = choose.group(1).toUpperCase(Locale.ROOT);
                    }
                    default -> { /* not reached */ }
                }
                continue;
            }
            Matcher choose = CHOOSE.matcher(line);
            if (choose.lookingAt() || (b.inSolution && choose.find())) {
                if (current[ANSWER].isEmpty()) current[ANSWER] = choose.group(1).toUpperCase(Locale.ROOT);
                continue;
            }
            if (b.inSolution) continue;
            if (b.lastOption < 0) {
                current[PROMPT] = current[PROMPT].isEmpty() ? line : current[PROMPT] + "\n" + line;
            } else {
                current[FIRST_OPTION + b.lastOption] = (current[FIRST_OPTION + b.lastOption] + " " + line).strip();
            }
        }
    }

    /**
     * A line inside the answer / solution section: "Câu 3: C" or "Câu 3. … Chọn C" (then "Chọn C" on a following line
     * of that solution), or a line made only of entries ("1C 2B 3-D"). Other solution text is skipped, so "I = 2 A"
     * in a worked answer is not read as "question 2: A".
     */
    private static final Pattern LEADING_LETTER = Pattern.compile("^\\*?\\s*([A-J])(?![\\p{L}\\d])");

    private static void keyLine(String line, Builder b) {
        Matcher q = QUESTION.matcher(line);
        if (q.matches()) {
            b.keyQuestion = Integer.parseInt(q.group(1));
            Matcher letter = LEADING_LETTER.matcher(q.group(3).strip());
            Matcher choose = CHOOSE.matcher(q.group(3));
            if (letter.find()) b.keyOnce(letter.group(1));
            else if (choose.find()) b.keyOnce(choose.group(1));
            return;
        }
        Matcher entries = KEY_ENTRY.matcher(line);
        int count = 0;
        StringBuilder rest = new StringBuilder();
        int last = 0;
        while (entries.find()) { count++; rest.append(line, last, entries.start()); last = entries.end(); }
        rest.append(line.substring(last));
        if (count > 0 && rest.codePoints().filter(Character::isLetter).count() <= 12) {
            b.keyQuestion = -1;
            b.keyText(line);
            return;
        }
        Matcher choose = CHOOSE.matcher(line);
        if (b.keyQuestion > 0 && choose.find()) b.keyOnce(choose.group(1));
    }

    /** Section headings: "PHẦN A. …", "DẠNG 2: …", "I. LÝ THUYẾT", or any line written all in capitals */
    static boolean isHeading(String line) {
        String plain = HomeworkQuestionImportService.plain(line);
        if (plain.matches("^(phan|dang|chuong|muc|chu de)\\s+([a-z]|\\d+|[ivx]+)\\b.*")) return true;
        if (line.matches("^[IVX]{1,5}\\s*[.)\\-–].*")) return true;
        long letters = line.codePoints().filter(Character::isLetter).count();
        return letters >= 6 && line.codePoints().noneMatch(Character::isLowerCase);
    }

    /** A table of numbers over letters, or of cells like "1C" / "1.C" — an answer key */
    private static boolean looksLikeKey(List<List<String>> rows) {
        int keyCells = 0, filled = 0;
        for (List<String> row : rows) {
            for (String cell : row) {
                String c = cell.strip();
                if (c.isEmpty()) continue;
                filled++;
                if (c.matches("(?i)[A-J]") || c.matches("\\d{1,3}") || c.matches("(?i)\\d{1,3}\\s*[.:)\\-–]?\\s*[A-J]")) keyCells++;
            }
        }
        return keyCells >= 4 && keyCells * 10 >= filled * 7;
    }

    /** Pairs a row of question numbers with the row of letters under it; otherwise reads "1C"-style cells */
    private static void keyTable(List<List<String>> rows, Builder b) {
        for (int r = 0; r < rows.size(); r++) {
            List<String> row = rows.get(r);
            long numbers = row.stream().filter(c -> c.strip().matches("\\d{1,3}")).count();
            if (numbers >= 2 && r + 1 < rows.size()) {
                List<String> below = rows.get(r + 1);
                for (int c = 0; c < row.size() && c < below.size(); c++) {
                    String n = row.get(c).strip(), letter = below.get(c).strip();
                    if (n.matches("\\d{1,3}") && letter.matches("(?i)[A-J]")) b.key(Integer.parseInt(n), letter);
                }
                r++;
                continue;
            }
            b.keyText(String.join("  ", row));
        }
    }

    private static boolean isEssay(String[] question) {
        String type = HomeworkQuestionImportService.plain(question[TYPE]);
        return type.equals("tu luan") || type.equals("tl") || type.equals("essay");
    }

    /** "Đáp án: B. 5" → "B"; anything else is kept for the parser to judge */
    private static String answerLetter(String value) {
        Matcher m = Pattern.compile("^\\s*\\*?\\s*([A-Ja-j])(?:\\s*[.)]|\\s|$).*$", Pattern.DOTALL).matcher(value);
        return m.matches() ? m.group(1).toUpperCase(Locale.ROOT) : value.strip();
    }

    /** "Đáp án: B" style lines → {answer|points|type|publish|solution, value}; null when the line is not one */
    private static String[] keyValue(String line) {
        int colon = line.indexOf(':');
        if (colon < 0) colon = line.indexOf('：');
        if (colon <= 0 || colon > 30) return null;
        String key = HomeworkQuestionImportService.plain(line.substring(0, colon));
        String value = line.substring(colon + 1).strip();
        if (Set.of("dap an", "dap an dung", "answer", "key").contains(key)) return new String[] {"answer", value};
        if (Set.of("diem", "so diem", "points", "point").contains(key)) return new String[] {"points", value};
        if (Set.of("loai", "loai cau", "loai cau hoi", "type").contains(key)) return new String[] {"type", value};
        if (Set.of("gio mo bai", "thoi gian mo bai", "mo bai luc", "publish time", "publish_time", "open at").contains(key))
            return new String[] {"publish", value};
        if (SOLUTION_KEYS.contains(key)) return new String[] {"solution", value};
        return null;
    }

    /** "(tự luận, 2 điểm)" → type and points on the row; false when the brackets hold neither */
    private static boolean details(String inside, String[] row) {
        String p = HomeworkQuestionImportService.plain(inside);
        boolean used = false;
        if (p.contains("tu luan") || p.contains("essay")) { row[TYPE] = "tự luận"; used = true; }
        else if (p.contains("trac nghiem")) { row[TYPE] = "trắc nghiệm"; used = true; }
        Matcher points = POINTS_IN.matcher(inside);
        if (points.find()) { row[POINTS] = points.group(1); used = true; }
        return used;
    }

    /**
     * "A. 4   B. 5   *C. 6" → {mark, letter, text} per option; null when the line does not start with an option.
     * Further markers on the line only count when the letters follow on (A, B, C…), so "x = A. Sau đó" stays text.
     */
    static List<String[]> options(String line) {
        Matcher m = OPTION.matcher(line);
        if (!m.find() || m.start() != 0) return null;
        List<int[]> marks = new ArrayList<>(); // start, end of each accepted marker
        List<String[]> found = new ArrayList<>();
        char expected = m.group(2).charAt(0);
        do {
            if (m.group(2).charAt(0) != expected) continue;
            marks.add(new int[] {m.start(), m.end()});
            found.add(new String[] {m.group(1), m.group(2), ""});
            expected++;
        } while (m.find());
        for (int i = 0; i < found.size(); i++) {
            int end = i + 1 < marks.size() ? marks.get(i + 1)[0] : line.length();
            found.get(i)[2] = line.substring(marks.get(i)[1], end).strip();
        }
        return found;
    }

    // ── Word automatic numbering (.docx) ────────────────────────────────────

    /** Rebuilds list labels ("Câu 1.", "A.") that Word draws but does not store in the text */
    private static final class Numbering {
        private final Map<BigInteger, int[]> counters = new HashMap<>();

        String prefix(XWPFParagraph paragraph) {
            BigInteger numId = paragraph.getNumID();
            String pattern = paragraph.getNumLevelText();
            if (numId == null || pattern == null) return "";
            String format = Optional.ofNullable(paragraph.getNumFmt()).orElse("decimal");
            if (format.equals("bullet") || format.equals("none")) return "";
            int level = paragraph.getNumIlvl() == null ? 0 : Math.min(8, paragraph.getNumIlvl().intValue());
            int[] count = counters.computeIfAbsent(numId, id -> new int[9]);
            count[level]++;
            for (int deeper = level + 1; deeper < count.length; deeper++) count[deeper] = 0;
            StringBuilder out = new StringBuilder();
            Matcher m = Pattern.compile("%(\\d)").matcher(pattern);
            while (m.find()) {
                int lvl = Integer.parseInt(m.group(1)) - 1;
                int value = lvl >= 0 && lvl < count.length ? Math.max(1, count[lvl]) : 1;
                m.appendReplacement(out, Matcher.quoteReplacement(lvl == level ? format(value, format) : String.valueOf(value)));
            }
            m.appendTail(out);
            return out.append(' ').toString();
        }

        private static String format(int value, String format) {
            return switch (format) {
                case "upperLetter" -> String.valueOf((char) ('A' + (value - 1) % 26));
                case "lowerLetter" -> String.valueOf((char) ('a' + (value - 1) % 26));
                case "upperRoman" -> roman(value);
                case "lowerRoman" -> roman(value).toLowerCase(Locale.ROOT);
                default -> String.valueOf(value);
            };
        }

        private static String roman(int value) {
            int[] n = {1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1};
            String[] s = {"M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"};
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < n.length; i++) while (value >= n[i]) { out.append(s[i]); value -= n[i]; }
            return out.toString();
        }
    }
}
