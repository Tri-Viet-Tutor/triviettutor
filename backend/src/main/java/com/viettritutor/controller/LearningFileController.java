package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.LearningFileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Upload and download of homework and submission attachments. */
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Tag(name = "Learning files", description = "Homework and submission attachments (max 10 MB).")
public class LearningFileController {
    /** Only these open in the browser; the type comes from the stored name, never from the uploader's Content-Type. */
    private static final Map<String, MediaType> INLINE_TYPES = Map.of(
            "pdf", MediaType.APPLICATION_PDF, "png", MediaType.IMAGE_PNG, "jpg", MediaType.IMAGE_JPEG,
            "jpeg", MediaType.IMAGE_JPEG, "gif", MediaType.IMAGE_GIF, "webp", MediaType.parseMediaType("image/webp"));

    private final LearningFileService files;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
    @Operation(summary = "Upload an attachment",
            description = "PDF, Office, text, image, zip or rar up to 10 MB. Returns a url to put in homework or submission resourceUrl.")
    public ApiResponse<LearningFileService.UploadedFile> upload(@RequestParam("file") MultipartFile file,
                                                                @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(files.upload(file, actor));
    }

    @GetMapping("/{key}")
    @Operation(summary = "Download an attachment",
            description = "Public link with an unguessable key, so it opens directly from homework and submission pages.")
    public ResponseEntity<byte[]> download(@PathVariable UUID key) {
        LearningFileService.StoredFile file = files.load(key);
        String name = file.fileName();
        int dot = name.lastIndexOf('.');
        MediaType type = dot < 0 ? null : INLINE_TYPES.get(name.substring(dot + 1).toLowerCase(Locale.ROOT));
        boolean inline = type != null;
        ContentDisposition disposition = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(name, StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(inline ? type : MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(file.data());
    }
}
