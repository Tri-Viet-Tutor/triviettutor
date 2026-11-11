package com.viettritutor.entity;

import com.viettritutor.enums.QuestionType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "homework_questions", uniqueConstraints = @UniqueConstraint(columnNames = {"homework_id", "position"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeworkQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "homework_id", nullable = false)
    private Long homeworkId;
    @Column(nullable = false)
    private int position;
    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 20)
    private QuestionType type;
    @Column(nullable = false, columnDefinition = "text")
    private String prompt;
    /** JSON array of the choices; null for essay questions. */
    @Column(columnDefinition = "text")
    private String options;
    /** First correct option (the only one for a single-answer question). */
    @Column(name = "correct_option")
    private Integer correctOption;
    /** All correct options as "0,2" when there are two or more; null for single-answer questions. */
    @Column(name = "correct_options", columnDefinition = "text")
    private String correctOptions;

    /** Every correct option index, sorted; empty for essays. */
    public java.util.List<Integer> correctSet() {
        return OptionIndexes.of(correctOption, correctOptions);
    }
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal points;
}
