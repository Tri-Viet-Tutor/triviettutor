-- Mỗi câu hỏi có thể kèm một ảnh hoặc video minh họa (chỉ một, không phải cả hai).
-- Ảnh: gia sư tải lên qua POST /api/v1/files rồi lưu link tải ở đây.
-- Video: gia sư dán link ngoài (YouTube, Drive...), hệ thống không lưu file video.
ALTER TABLE homework_questions ADD COLUMN media_url TEXT;
ALTER TABLE homework_questions ADD COLUMN media_type VARCHAR(10);

ALTER TABLE homework_questions
    ADD CONSTRAINT homework_questions_media_pair
        CHECK ((media_url IS NULL AND media_type IS NULL)
            OR (media_type IN ('IMAGE', 'VIDEO') AND length(trim(media_url)) BETWEEN 1 AND 2000));
