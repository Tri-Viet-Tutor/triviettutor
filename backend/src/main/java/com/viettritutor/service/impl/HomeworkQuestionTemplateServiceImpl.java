package com.viettritutor.service.impl;
import com.viettritutor.service.*;
import com.viettritutor.service.HomeworkQuestionTemplateService;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

/** HW-02: sample question files (Excel and Word) that {@link HomeworkQuestionImportService} reads back as-is. */
@Service
public class HomeworkQuestionTemplateServiceImpl implements HomeworkQuestionTemplateService {
    static final String ALL_CORRECT = "Tất cả các đáp án trên đều đúng";

    private static final List<String> HEADER = List.of("cau_hoi", "loai", "A", "B", "C", "D", "dap_an", "diem", "publish_time");
    private static final List<List<String>> ROWS = List.of(
            List.of("2 + 3 bằng bao nhiêu?", "trắc nghiệm", "4", "5", "6", "7", "B", "1", "2026-12-01 19:30"),
            List.of("Số nào là số chẵn?", "trắc nghiệm", "2", "4", "6", ALL_CORRECT, "", "1", ""),
            List.of("Trình bày cách giải phương trình bậc nhất.", "tự luận", "", "", "", "", "", "2", ""),
            List.of("Những số nào là số nguyên tố? (chọn 2 đáp án)", "trắc nghiệm", "2", "4", "3", "9", "A, C", "1", ""));

    /** Excel: header row + examples; publish_time is text so Excel does not reformat it */
    @Override
    public byte[] xlsx() {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Cau hoi");
            CellStyle head = wb.createCellStyle();
            Font bold = wb.createFont();
            bold.setBold(true);
            head.setFont(bold);
            head.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            head.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            CellStyle text = wb.createCellStyle();
            text.setDataFormat(wb.createDataFormat().getFormat("@"));
            text.setWrapText(true);
            text.setVerticalAlignment(VerticalAlignment.TOP);

            Row header = sheet.createRow(0);
            for (int c = 0; c < HEADER.size(); c++) {
                Cell cell = header.createCell(c);
                cell.setCellValue(HEADER.get(c));
                cell.setCellStyle(head);
            }
            for (int r = 0; r < ROWS.size(); r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < HEADER.size(); c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue(ROWS.get(r).get(c));
                    cell.setCellStyle(text);
                }
            }
            int[] widths = {42, 14, 12, 12, 12, 30, 9, 7, 18};
            for (int c = 0; c < widths.length; c++) {
                sheet.setColumnWidth(c, widths[c] * 256);
                sheet.setDefaultColumnStyle(c, text);
            }
            sheet.createFreezePane(0, 1);

            Sheet help = wb.createSheet("Huong dan");
            String[] lines = {
                    "Mỗi dòng ở trang \"Cau hoi\" là một câu. Giữ nguyên dòng tiêu đề.",
                    "loai: trắc nghiệm hoặc tự luận (để trống: có phương án là trắc nghiệm, không có là tự luận).",
                    "A–D (có thể thêm cột E…J): các phương án. dap_an: chữ cái của đáp án đúng, ví dụ B; câu nhiều đáp án đúng ghi \"A, C\" (học viên phải chọn đủ và đúng mới có điểm).",
                    "Để trống dap_an nếu có phương án \"" + ALL_CORRECT + "\" — hệ thống tự chọn phương án đó.",
                    "diem: số điểm của câu (để trống = 1). publish_time: giờ mở bài, ví dụ 2026-12-01 19:30 (chỉ cần ghi ở một dòng).",
            };
            for (int i = 0; i < lines.length; i++) help.createRow(i).createCell(0).setCellValue(lines[i]);
            help.setColumnWidth(0, 110 * 256);

            wb.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    /** Word: free-text exam layout ("Câu 1: …", "A. …", "Đáp án: B") */
    @Override
    public byte[] docx() {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            paragraph(doc, "MẪU CÂU HỎI BÀI TẬP", true, 16);
            paragraph(doc, "Cách viết: mỗi câu bắt đầu bằng \"Câu 1:\", \"Câu 2:\"…; trong ngoặc sau số câu có thể ghi loại và điểm, "
                    + "ví dụ \"Câu 3 (tự luận, 2 điểm):\" (mặc định 1 điểm). Phương án viết \"A. …\", \"B. …\" — mỗi phương án một dòng "
                    + "hoặc nhiều phương án trên một dòng. Đáp án ghi \"Đáp án: B\" hoặc đánh dấu * trước chữ cái (\"*B. 5\"); câu nhiều đáp án đúng ghi \"Đáp án: A, C\" (học viên phải chọn đủ và đúng mới có điểm). "
                    + "Câu có phương án \"" + ALL_CORRECT + "\" có thể bỏ trống đáp án. Dòng \"Giờ mở bài:\" là không bắt buộc. "
                    + "Các dòng trước \"Câu 1\" (như dòng hướng dẫn này) được bỏ qua.", false, 10);
            paragraph(doc, "", false, 11);
            paragraph(doc, "Giờ mở bài: 2026-12-01 19:30", false, 12);
            paragraph(doc, "", false, 11);
            paragraph(doc, "Câu 1 (1 điểm): 2 + 3 bằng bao nhiêu?", true, 12);
            paragraph(doc, "A. 4\t\tB. 5\t\tC. 6\t\tD. 7", false, 12);
            paragraph(doc, "Đáp án: B", false, 12);
            paragraph(doc, "", false, 11);
            paragraph(doc, "Câu 2: Số nào là số chẵn?", true, 12);
            paragraph(doc, "A. 2", false, 12);
            paragraph(doc, "B. 4", false, 12);
            paragraph(doc, "C. 6", false, 12);
            paragraph(doc, "D. " + ALL_CORRECT, false, 12);
            paragraph(doc, "", false, 11);
            paragraph(doc, "Câu 3 (tự luận, 2 điểm): Trình bày cách giải phương trình bậc nhất.", true, 12);
            paragraph(doc, "", false, 11);
            paragraph(doc, "Câu 4: Những số nào là số nguyên tố? (chọn 2 đáp án)", true, 12);
            paragraph(doc, "A. 2\t\tB. 4\t\tC. 3\t\tD. 9", false, 12);
            paragraph(doc, "Đáp án: A, C", false, 12);
            doc.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static void paragraph(XWPFDocument doc, String text, boolean bold, int size) {
        XWPFParagraph paragraph = doc.createParagraph();
        paragraph.setSpacingAfter(80);
        XWPFRun run = paragraph.createRun();
        run.setFontFamily("Times New Roman");
        run.setFontSize(size);
        run.setBold(bold);
        String[] parts = text.split("\t+", -1);
        run.setText(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            XWPFRun next = paragraph.createRun();
            next.setFontFamily("Times New Roman");
            next.setFontSize(size);
            next.addTab();
            next.addTab();
            next.setText(parts[i]);
        }
    }
}
