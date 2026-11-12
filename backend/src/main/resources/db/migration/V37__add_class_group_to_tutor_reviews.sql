ALTER TABLE tutor_reviews
    ADD COLUMN class_group_id BIGINT;

ALTER TABLE tutor_reviews
    ADD CONSTRAINT fk_tutor_reviews_class_group
        FOREIGN KEY (class_group_id)
            REFERENCES class_groups(id);

ALTER TABLE tutor_reviews
DROP CONSTRAINT uk_tutor_review_student_tutor;

ALTER TABLE tutor_reviews
    ADD CONSTRAINT uk_tutor_review_student_class
        UNIQUE (student_id, class_group_id);