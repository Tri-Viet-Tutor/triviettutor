package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.learning.QuestionImportResponse;
import com.viettritutor.service.HomeworkQuestionImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Homeworks", description = "Homework lifecycle is independent of each student's submission lifecycle.")
public class HomeworkQuestionImportController {
    private final HomeworkQuestionImportService importer;

    @PostMapping(value = "/homeworks/questions/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Read quiz questions from a .csv or .xlsx file (nothing is saved)",
            description = "One question per row. Headers (accents optional): cau_hoi, loai (trắc nghiệm/tự luận), A..J, "
                    + "dap_an (letter), diem, publish_time. An empty dap_an picks the option \"Tất cả các đáp án trên đều đúng\". "
                    + "publish_time (one value per file) is meant for the homework openAt. Max 2 MB and 100 questions; "
                    + "row errors are returned instead of failing the whole file.")
    public ApiResponse<QuestionImportResponse> importQuestions(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(importer.read(file));
    }
}
