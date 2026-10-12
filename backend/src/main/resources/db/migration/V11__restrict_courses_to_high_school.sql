-- Restrict the supported grades without rewriting an applied migration or changing course data.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM courses WHERE grade_level NOT IN ('GRADE_10', 'GRADE_11', 'GRADE_12')) THEN
        RAISE EXCEPTION 'High-school-only migration blocked: courses outside GRADE_10, GRADE_11, GRADE_12 exist. Review those courses and their references before retrying; do not automatically remap grade levels.';
    END IF;
END;
$$;

ALTER TABLE courses DROP CONSTRAINT courses_grade_level_check;
ALTER TABLE courses ADD CONSTRAINT courses_grade_level_check
    CHECK (grade_level IN ('GRADE_10', 'GRADE_11', 'GRADE_12'));
