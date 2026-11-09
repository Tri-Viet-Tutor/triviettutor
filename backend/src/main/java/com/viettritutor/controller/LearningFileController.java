package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.entity.LearningFile;
import com.viettritutor.entity.User;
import com.viettritutor.repository.LearningFileRepository;
import com.viettritutor.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Upload and download of homework and submission attachments. */
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Tag(name = "Learning files", description = "Homework and submission attachments (max 10 MB).")
public class LearningFileController {
    static final long MAX_SIZE = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "png", "jpg", "jpeg", "gif", "webp", "zip", "rar");
    /** Only these open in the browser; the type comes from the stored name, never from the uploader's Content-Type. */
    private static final Map<String, MediaType> INLINE_TYPES = Map.of(
            "pdf", MediaType.APPLICATION_PDF, "png", MediaType.IMAGE_PNG, "jpg", MediaType.IMAGE_JPEG,
            "jpeg", MediaType.IMAGE_JPEG, "gif", MediaType.IMAGE_GIF, "webp", MediaType.parseMediaType("image/webp"));

    private final LearningFileRepository files;
    private final Clock clock;

    public record UploadedFile(String url, String fileName, String contentType, long size) {}

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
    @Operation(summary = "Upload an attachment",
            description = "PDF, Office, text, image, zip or rar up to 10 MB. Returns a url to put in homework or submission resourceUrl.")
    public ApiResponse<UploadedFile> upload(@RequestParam("file") MultipartFile file,
                                            @Parameter(hidden = true) @CurrentUser User actor) {
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
            return ApiResponse.ok(new UploadedFile(url, name, saved.getContentType(), saved.getSizeBytes()));
        } catch (IOException ex) {
            throw new BusinessException(ErrorCode.INVALID_FILE, "Cannot read the file");
        }
    }

    @GetMapping("/{key}")
    @Operation(summary = "Download an attachment",
            description = "Public link with an unguessable key, so it opens directly from homework and submission pages.")
    public ResponseEntity<byte[]> download(@PathVariable UUID key) {
        LearningFile file = files.findByFileKey(key).orElseThrow(() -> new BusinessException(ErrorCode.FILE_NOT_FOUND));
        // A client-chosen type such as image/svg+xml would run script on this origin, so it is ignored here.
        String name = file.getFileName();
        int dot = name.lastIndexOf('.');
        MediaType type = dot < 0 ? null : INLINE_TYPES.get(name.substring(dot + 1).toLowerCase(Locale.ROOT));
        boolean inline = type != null;
        ContentDisposition disposition = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(name, StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(inline ? type : MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(file.getData());
    }
}
