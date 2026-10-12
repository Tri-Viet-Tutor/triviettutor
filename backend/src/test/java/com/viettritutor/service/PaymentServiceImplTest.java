package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.config.SepayProperties;
import com.viettritutor.dto.payment.CreatePaymentIntentRequest;
import com.viettritutor.dto.payment.PaymentIntentResponse;
import com.viettritutor.dto.payment.SepayWebhookDto;
import com.viettritutor.entity.*;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.enums.PaymentStatus;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.PaymentRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.impl.PaymentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private ClassGroupRepository classGroupRepository;

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private ConflictValidationService conflictService;

    @Mock
    private PricingService pricingService;

    @Mock
    private LearningScheduleService learningScheduleService;

    @Mock
    private SepayProperties sepayProperties;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    private ClassGroup mockClassGroup;
    private Course mockCourse;

    @BeforeEach
    void setUp() {
        mockCourse = Course.builder()
                .id(1L)
                .name("Toán 12 Cơ Bản")
                .basePrice1on1(new BigDecimal("5000000"))
                .build();

        mockClassGroup = ClassGroup.builder()
                .id(100L)
                .classCode("MATH-12-001")
                .classType(ClassType.GROUP)
                .status(ClassStatus.ENROLLING)
                .maxStudents(8)
                .course(mockCourse)
                .startDate(LocalDate.now().plusDays(7))
                .build();
    }

    @Test
    void createPaymentIntent_success_returnsIntentResponse() {
        when(classGroupRepository.findById(100L)).thenReturn(Optional.of(mockClassGroup));
        when(enrollmentRepository.existsByStudentIdAndClassGroupIdAndStatus(1L, 100L, EnrollmentStatus.ACTIVE)).thenReturn(false);
        when(enrollmentRepository.countByClassGroupIdAndStatus(100L, EnrollmentStatus.ACTIVE)).thenReturn(2L);
        when(sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(100L)).thenReturn(Collections.emptyList());
        when(conflictService.checkStudent(eq(1L), any())).thenReturn(Collections.emptyList());
        when(pricingService.discount(ClassType.GROUP, 2L)).thenReturn(new BigDecimal("0.20"));
        when(pricingService.estimate(new BigDecimal("5000000"), new BigDecimal("0.20"))).thenReturn(new BigDecimal("4000000"));

        when(sepayProperties.getBankBin()).thenReturn("970422");
        when(sepayProperties.getBankAccountNo()).thenReturn("0123456789");
        when(sepayProperties.getTestAmount()).thenReturn(new BigDecimal("2000"));

        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            p.setId(999L);
            return p;
        });

        CreatePaymentIntentRequest request = new CreatePaymentIntentRequest(100L);
        PaymentIntentResponse response = paymentService.createPaymentIntent(1L, request);

        assertNotNull(response);
        assertEquals(999L, response.getPaymentId());
        assertTrue(response.getPaymentCode().startsWith("VTT"));
        assertEquals(PaymentStatus.PENDING, response.getStatus());
        assertEquals(new BigDecimal("4000000"), response.getAmount());
        assertTrue(response.getQrImageUrl().contains("970422"));
        assertTrue(response.getQrImageUrl().contains("0123456789"));
    }

    @Test
    void createPaymentIntent_whenClassNotEnrolling_throwsException() {
        mockClassGroup.setStatus(ClassStatus.IN_PROGRESS);
        when(classGroupRepository.findById(100L)).thenReturn(Optional.of(mockClassGroup));

        CreatePaymentIntentRequest request = new CreatePaymentIntentRequest(100L);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                paymentService.createPaymentIntent(1L, request));

        assertEquals(ErrorCode.CLASS_NOT_ENROLLING, ex.getErrorCode());
    }

    @Test
    void createPaymentIntent_whenAlreadyEnrolled_throwsException() {
        when(classGroupRepository.findById(100L)).thenReturn(Optional.of(mockClassGroup));
        when(enrollmentRepository.existsByStudentIdAndClassGroupIdAndStatus(1L, 100L, EnrollmentStatus.ACTIVE)).thenReturn(true);

        CreatePaymentIntentRequest request = new CreatePaymentIntentRequest(100L);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                paymentService.createPaymentIntent(1L, request));

        assertEquals(ErrorCode.ENROLLMENT_ALREADY_EXISTS, ex.getErrorCode());
    }

    @Test
    void handleSepayWebhook_success_activatesEnrollmentAndCompletesPayment() {
        String paymentCode = "VTTABC1234";

        Payment mockPayment = Payment.builder()
                .id(55L)
                .paymentCode(paymentCode)
                .studentId(10L)
                .classGroupId(100L)
                .amount(new BigDecimal("4000000"))
                .status(PaymentStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();

        when(sepayProperties.getWebhookKey()).thenReturn("secret-key");
        when(paymentRepository.existsBySepayTransactionId("123456")).thenReturn(false);
        when(paymentRepository.findByPaymentCode(paymentCode)).thenReturn(Optional.of(mockPayment));
        when(classGroupRepository.findById(100L)).thenReturn(Optional.of(mockClassGroup));
        when(enrollmentRepository.countByClassGroupIdAndStatus(100L, EnrollmentStatus.ACTIVE)).thenReturn(0L);
        when(pricingService.discount(ClassType.GROUP, 0L)).thenReturn(BigDecimal.ZERO);

        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(invocation -> {
            Enrollment e = invocation.getArgument(0);
            e.setId(777L);
            return e;
        });

        SepayWebhookDto payload = SepayWebhookDto.builder()
                .id(123456L)
                .content(paymentCode + " chuyen khoan")
                .transferType("in")
                .transferAmount(new BigDecimal("4000000"))
                .referenceCode("REF-123")
                .build();

        paymentService.handleSepayWebhook(payload, "Apikey secret-key");

        assertEquals(PaymentStatus.COMPLETED, mockPayment.getStatus());
        assertNotNull(mockPayment.getPaidAt());
        assertEquals("123456", mockPayment.getSepayTransactionId());
        assertEquals("REF-123", mockPayment.getSepayReferenceCode());
        assertEquals(777L, mockPayment.getEnrollmentId());

        verify(enrollmentRepository).save(any(Enrollment.class));
        verify(paymentRepository, atLeastOnce()).save(mockPayment);
    }

    @Test
    void handleSepayWebhook_whenUnauthorizedHeader_throwsException() {
        when(sepayProperties.getWebhookKey()).thenReturn("secret-key");

        SepayWebhookDto payload = SepayWebhookDto.builder().build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                paymentService.handleSepayWebhook(payload, "Apikey wrong-key"));

        assertEquals(ErrorCode.SEPAY_UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void handleSepayWebhook_whenDebitTransaction_ignoresGracefully() {
        SepayWebhookDto payload = SepayWebhookDto.builder()
                .transferType("out")
                .build();

        assertDoesNotThrow(() -> paymentService.handleSepayWebhook(payload, null));
        verify(paymentRepository, never()).findByPaymentCode(any());
    }

    @Test
    void bypassPayment_success_simulatesWebhook() {
        String paymentCode = "VTTTEST99";
        Payment mockPayment = Payment.builder()
                .id(88L)
                .paymentCode(paymentCode)
                .studentId(10L)
                .classGroupId(100L)
                .amount(new BigDecimal("4000000"))
                .status(PaymentStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();

        when(paymentRepository.findByPaymentCode(paymentCode)).thenReturn(Optional.of(mockPayment));
        when(classGroupRepository.findById(100L)).thenReturn(Optional.of(mockClassGroup));
        when(enrollmentRepository.countByClassGroupIdAndStatus(100L, EnrollmentStatus.ACTIVE)).thenReturn(0L);

        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(invocation -> {
            Enrollment e = invocation.getArgument(0);
            e.setId(888L);
            return e;
        });

        PaymentIntentResponse response = paymentService.bypassPayment(paymentCode);

        assertNotNull(response);
        assertEquals(PaymentStatus.COMPLETED, mockPayment.getStatus());
    }
}
