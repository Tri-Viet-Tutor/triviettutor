package com.viettritutor.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xwpf.usermodel.*;

/** HW-02: sample question files (Excel and Word) that {@link HomeworkQuestionImportService} reads back as-is. */
public interface HomeworkQuestionTemplateService {

/** Excel: header row + examples; publish_time is text so Excel does not reformat it */
    byte[] xlsx();
/** Word: free-text exam layout ("Câu 1: …", "A. …", "Đáp án: B") */
    byte[] docx();
}
