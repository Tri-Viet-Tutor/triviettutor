package com.viettritutor.service;

import com.viettritutor.entity.User;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/** Stores homework and submission attachments. HTTP headers stay in the controller. */
public interface LearningFileService {
    record UploadedFile(String url, String fileName, String contentType, long size) {}

    record StoredFile(byte[] data, String fileName, String storedContentType) {}

    UploadedFile upload(MultipartFile file, User actor);

    StoredFile load(UUID key);
}
