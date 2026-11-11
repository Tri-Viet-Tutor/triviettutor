package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "homework_answers", uniqueConstraints = @UniqueConstraint(columnNames = {"submission_id", "question_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeworkAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "submission_id", nullable = false)
    private Long submissionId;
    @Column(name = "question_id", nullable = false)
    private Long questionId;
    /** First picked option (the only one on a single-answer question). */
    @Column(name = "selected_option")
    private Integer selectedOption;
    /** All picked options as "0,2" when two or more were picked; otherwise null. */
    @Column(name = "selected_options", columnDefinition = "text")
    private String selectedOptions;

    /** Every picked option index, sorted; empty when nothing was picked. */
    public java.util.List<Integer> selectedSet() {
        return OptionIndexes.of(selectedOption, selectedOptions);
    }
    @Column(name = "text_answer", columnDefinition = "text")
    private String textAnswer;
    @Column(precision = 10, scale = 2)
    private BigDecimal score;
}
