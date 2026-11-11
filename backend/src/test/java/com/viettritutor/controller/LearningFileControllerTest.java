package com.viettritutor.controller;

import com.viettritutor.service.LearningFileService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LearningFileControllerTest {
    private final LearningFileService files = mock(LearningFileService.class);
    private final LearningFileController controller = new LearningFileController(files);

    private ResponseEntity<byte[]> download(String name, String storedType) {
        UUID key = UUID.randomUUID();
        when(files.load(key)).thenReturn(new LearningFileService.StoredFile(new byte[]{1}, name, storedType));
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
