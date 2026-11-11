package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.entity.LearningFile;
import com.viettritutor.entity.User;
import com.viettritutor.repository.LearningFileRepository;
import com.viettritutor.service.LearningFileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LearningFileServiceImpl implements LearningFileService {
    static final long MAX_SIZE = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "png", "jpg", "jpeg", "gif", "webp", "zip", "rar");

    private final LearningFileRepository files;
    private final Clock clock;

    @Override
    public UploadedFile upload(MultipartFile file, User actor) {
        if (file == null || file.isEmpty()) throw new BusinessException(ErrorCode.INVALID_FILE, "Please choose a file");
        if (file.getSize() > MAX_SIZE) throw new BusinessException(ErrorCode.INVALID_FILE, "File must not exceed 10 MB");
        String name = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename().replaceAll("[\\\\/\\r\\n\"]", "_").trim();
        if (name.isEmpty()) name = "file";
        if (name.length() > 255) name = name.substring(name.length() - 255);
        int dot = name.lastIndexOf('.');
        String extension = dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BusinessException(ErrorCode.INVALID_FILE, "Unsupported file type");
        }
        String type = file.getContentType() == null || file.getContentType().isBlank()
                ? MediaType.APPLICATION_OCTET_STREAM_VALUE : file.getContentType();
        try {
            LearningFile saved = files.save(LearningFile.builder().fileKey(UUID.randomUUID()).ownerId(actor.getId())
                    .fileName(name).contentType(type.length() > 150 ? MediaType.APPLICATION_OCTET_STREAM_VALUE : type)
                    .sizeBytes(file.getSize()).data(file.getBytes()).createdAt(OffsetDateTime.now(clock)).build());
            String url = "/api/v1/files/" + saved.getFileKey() + "?name=" + URLEncoder.encode(name, StandardCharsets.UTF_8);
            return new UploadedFile(url, name, saved.getContentType(), saved.getSizeBytes());
        } catch (IOException ex) {
            throw new BusinessException(ErrorCode.INVALID_FILE, "Cannot read the file");
        }
    }

    @Override
    public StoredFile load(UUID key) {
        LearningFile file = files.findByFileKey(key).orElseThrow(() -> new BusinessException(ErrorCode.FILE_NOT_FOUND));
        return new StoredFile(file.getData(), file.getFileName(), file.getContentType());
    }
}
