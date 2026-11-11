package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.learning.QuestionImportResponse;
import com.viettritutor.service.HomeworkQuestionImportService;
import com.viettritutor.service.HomeworkQuestionTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Homeworks", description = "Homework lifecycle is independent of each student's submission lifecycle.")
public class HomeworkQuestionImportController {
    private final HomeworkQuestionImportService importer;
    private final HomeworkQuestionTemplateService templates;

    @PostMapping(value = "/homeworks/questions/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Read quiz questions from a .csv, .xlsx, .doc or .docx file (nothing is saved)",
            description = "One question per row. Headers (accents optional): cau_hoi, loai (trắc nghiệm/tự luận), A..J, "
                    + "dap_an (letter), diem, publish_time. An empty dap_an picks the option \"Tất cả các đáp án trên đều đúng\". "
                    + "publish_time (one value per file) is meant for the homework openAt. Max 2 MB and 100 questions; "
                    + "row errors are returned instead of failing the whole file.")
    public ApiResponse<QuestionImportResponse> importQuestions(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(importer.read(file));
    }

    @GetMapping("/homeworks/questions/template/{format}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Download a sample question file", description = "format: xlsx (one question per row) or docx "
            + "(\"Câu 1:\", \"A. …\", \"Đáp án: B\"). Both read back through POST /homeworks/questions/import.")
    public ResponseEntity<byte[]> template(@PathVariable String format) {
        return switch (format) {
            case "xlsx" -> file(templates.xlsx(), "mau-cau-hoi.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            case "docx" -> file(templates.docx(), "mau-cau-hoi.docx",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            default -> ResponseEntity.notFound().build();
        };
    }

    private static ResponseEntity<byte[]> file(byte[] body, String name, String type) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(type))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name).build().toString())
                .body(body);
    }
}
