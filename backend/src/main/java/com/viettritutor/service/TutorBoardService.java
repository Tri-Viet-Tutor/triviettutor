package com.viettritutor.service;

import com.viettritutor.dto.assignment.TutorBoardResponse;
import java.time.LocalDate;
import java.util.List;

/** Declared availability and teaching sessions of every tutor within a date range (max 31 days). */
public interface TutorBoardService {

    List<TutorBoardResponse> board(LocalDate from, LocalDate to);
}
