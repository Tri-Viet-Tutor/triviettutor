package com.viettritutor.controller;

import com.viettritutor.entity.LearningFile;
import com.viettritutor.repository.LearningFileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.time.Clock;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LearningFileControllerTest {
    private final LearningFileRepository files = mock(LearningFileRepository.class);
    private final LearningFileController controller = new LearningFileController(files, Clock.systemUTC());

    private ResponseEntity<byte[]> download(String name, String storedType) {
        UUID key = UUID.randomUUID();
        when(files.findByFileKey(key)).thenReturn(Optional.of(LearningFile.builder().fileKey(key).fileName(name)
                .contentType(storedType).data(new byte[]{1}).build()));
        return controller.download(key);
    }

    @Test
    void svgUploadedUnderAnImageNameIsNeverServedAsSvg() {
        ResponseEntity<byte[]> response = download("x.png", "image/svg+xml");
        assertEquals(MediaType.IMAGE_PNG, response.getHeaders().getContentType());
        assertEquals("nosniff", response.getHeaders().getFirst("X-Content-Type-Options"));
    }

    @Test
    void uploaderTypeDoesNotMakeOtherFilesInline() {
        ResponseEntity<byte[]> response = download("notes.txt", "image/svg+xml");
        assertEquals(MediaType.APPLICATION_OCTET_STREAM, response.getHeaders().getContentType());
        assertTrue(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION).startsWith("attachment"));
    }

    @Test
    void pdfAndImagesStillOpenInline() {
        ResponseEntity<byte[]> pdf = download("Bai tap.PDF", "application/octet-stream");
        assertEquals(MediaType.APPLICATION_PDF, pdf.getHeaders().getContentType());
        assertTrue(pdf.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION).startsWith("inline"));
        assertEquals(MediaType.IMAGE_JPEG, download("photo.jpeg", "image/jpeg").getHeaders().getContentType());
    }
}
