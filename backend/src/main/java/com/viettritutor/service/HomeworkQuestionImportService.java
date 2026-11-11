package com.viettritutor.service;

import com.viettritutor.dto.learning.QuestionImportResponse;
import org.apache.poi.ss.usermodel.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.*;
import java.time.*;
import java.util.*;

/**
 * HW-02: reads quiz questions from a .csv / .xlsx file (one question per row) or a Word file (.docx / .doc, see
 * {@link WordQuestionReader}) without saving anything.
 * Columns are matched by header, with or without Vietnamese accents: cau_hoi, loai, A..J, dap_an, diem, publish_time.
 * Rule D: a multiple-choice row with an empty dap_an whose option reads "Tất cả các đáp án trên đều đúng"
 * gets that option as the correct answer.
 */
public interface HomeworkQuestionImportService {

    QuestionImportResponse read(MultipartFile file);
}
