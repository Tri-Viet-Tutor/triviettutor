package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.common.exception.ScheduleConflictException;
import com.viettritutor.config.SepayProperties;
import com.viettritutor.dto.payment.CreatePaymentIntentRequest;
import com.viettritutor.dto.payment.PaymentIntentResponse;
import com.viettritutor.dto.payment.SepayWebhookDto;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Enrollment;
import com.viettritutor.entity.Payment;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.enums.PaymentStatus;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.PaymentRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.ConflictValidationService;
import com.viettritutor.service.LearningScheduleService;
import com.viettritutor.service.PaymentService;
import com.viettritutor.service.PricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ClassGroupRepository classGroupRepository;
    private final SessionRepository sessionRepository;
    private final ConflictValidationService conflictService;
    private final PricingService pricingService;
    private final LearningScheduleService learningScheduleService;
    private final SepayProperties sepayProperties;

    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    @Transactional
    public PaymentIntentResponse createPaymentIntent(Long studentId, CreatePaymentIntentRequest request) {
        Long classGroupId = request.getClassGroupId();

        // 1. Kiểm tra lớp học
        ClassGroup classGroup = classGroupRepository.findById(classGroupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));

        if (classGroup.getStatus() != ClassStatus.ENROLLING) {
            throw new BusinessException(ErrorCode.CLASS_NOT_ENROLLING);
        }

        // 2. Kiểm tra học viên đã đăng ký lớp này chưa
        if (enrollmentRepository.existsByStudentIdAndClassGroupIdAndStatus(studentId, classGroupId, EnrollmentStatus.ACTIVE)) {
            throw new BusinessException(ErrorCode.ENROLLMENT_ALREADY_EXISTS);
        }

        // 3. Kiểm tra sĩ số lớp
        long currentStudents = enrollmentRepository.countByClassGroupIdAndStatus(classGroupId, EnrollmentStatus.ACTIVE);
        if (classGroup.getMaxStudents() != null && currentStudents >= classGroup.getMaxStudents()) {
            throw new BusinessException(ErrorCode.CLASS_FULL);
        }

        // 4. Kiểm tra xung đột lịch học
        List<Session> sessions = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroupId);
        var conflicts = conflictService.checkStudent(studentId, sessions);
        if (!conflicts.isEmpty()) {
            throw new ScheduleConflictException(ErrorCode.STUDENT_SCHEDULE_CONFLICT, conflicts);
        }

        // 5. Tính học phí sau chiết khấu (BR-02.11)
        BigDecimal basePrice = (classGroup.getCourse() != null && classGroup.getCourse().getBasePrice1on1() != null)
                ? classGroup.getCourse().getBasePrice1on1()
                : BigDecimal.ZERO;
        BigDecimal discountRate = pricingService.discount(classGroup.getClassType(), currentStudents);
        BigDecimal amount = pricingService.estimate(basePrice, discountRate);

        // 6. Sinh mã thanh toán ngẫu nhiên duy nhất với tiền tố VTT
        String paymentCode = generatePaymentCode();

        // 7. Tạo link VietQR SePay
        String qrImageUrl = buildVietQrUrl(paymentCode, amount);

        // 8. Tạo bản ghi Payment
        LocalDateTime now = LocalDateTime.now();
        Payment payment = Payment.builder()
                .paymentCode(paymentCode)
                .studentId(studentId)
                .classGroupId(classGroupId)
                .amount(amount)
                .status(PaymentStatus.PENDING)
                .qrImageUrl(qrImageUrl)
                .transferContent(paymentCode)
                .expiresAt(now.plusMinutes(15))
                .createdAt(now)
                .updatedAt(now)
                .build();

        payment = paymentRepository.save(payment);

        return mapToResponse(payment, classGroup, discountRate);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentIntentResponse getPaymentIntent(Long paymentId, Long currentUserId, boolean isAdmin) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));

        if (!isAdmin && !payment.getStudentId().equals(currentUserId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        ClassGroup classGroup = classGroupRepository.findById(payment.getClassGroupId()).orElse(null);
        return mapToResponse(payment, classGroup, BigDecimal.ZERO);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentIntentResponse getPaymentIntentByCode(String paymentCode, Long currentUserId, boolean isAdmin) {
        Payment payment = paymentRepository.findByPaymentCode(paymentCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));

        if (!isAdmin && !payment.getStudentId().equals(currentUserId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        ClassGroup classGroup = classGroupRepository.findById(payment.getClassGroupId()).orElse(null);
        return mapToResponse(payment, classGroup, BigDecimal.ZERO);
    }

    @Override
    @Transactional
    public void handleSepayWebhook(SepayWebhookDto payload, String authHeader) {
        // 1. Xác thực API Key từ SePay (Header: Apikey <WEBHOOK_KEY>)
        String webhookKey = sepayProperties.getWebhookKey();
        if (authHeader != null && webhookKey != null && !webhookKey.isBlank()) {
            if (!authHeader.equals("Apikey " + webhookKey)) {
                log.warn("[SePay Webhook] Unauthorized Header: {}", authHeader);
                throw new BusinessException(ErrorCode.SEPAY_UNAUTHORIZED);
            }
        }

        // 2. Chỉ xử lý biến động tiền vào ("in")
        if (payload.getTransferType() != null && !"in".equalsIgnoreCase(payload.getTransferType())) {
            log.info("[SePay Webhook] Ignore debit transaction.");
            return;
        }

        // 3. Trích xuất mã thanh toán VTT... từ content
        String content = payload.getContent() != null ? payload.getContent() : "";
        Matcher matcher = Pattern.compile("VTT[A-Z0-9]+", Pattern.CASE_INSENSITIVE).matcher(content);
        if (!matcher.find()) {
            log.warn("[SePay Webhook] Không tìm thấy mã thanh toán VTT trong content: {}", content);
            return;
        }
        String paymentCode = matcher.group().toUpperCase(Locale.ROOT);

        // 4. Kiểm tra Idempotency giao dịch SePay
        String transactionIdStr = payload.getId() != null ? String.valueOf(payload.getId()) : null;
        if (transactionIdStr != null && paymentRepository.existsBySepayTransactionId(transactionIdStr)) {
            log.info("[SePay Webhook] Giao dịch ID {} đã được xử lý trước đó (Idempotent).", transactionIdStr);
            return;
        }

        // 5. Tìm Payment theo paymentCode
        Payment payment = paymentRepository.findByPaymentCode(paymentCode).orElse(null);
        if (payment == null) {
            log.warn("[SePay Webhook] Không tìm thấy Payment với code: {}", paymentCode);
            return;
        }

        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            log.info("[SePay Webhook] Thanh toán {} đã ở trạng thái COMPLETED.", paymentCode);
            return;
        }

        if (payment.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("[SePay Webhook] Thanh toán {} đã hết hạn.", paymentCode);
            payment.setStatus(PaymentStatus.EXPIRED);
            payment.setUpdatedAt(LocalDateTime.now());
            paymentRepository.save(payment);
            return;
        }

        // 6. Kiểm tra số tiền chuyển khoản
        BigDecimal transferAmount = payload.getTransferAmount() != null ? payload.getTransferAmount() : BigDecimal.ZERO;
        BigDecimal testAmount = sepayProperties.getTestAmount();
        boolean isInternalBypass = authHeader == null && transferAmount.compareTo(BigDecimal.ZERO) == 0;
        boolean isTestAmount = testAmount != null && transferAmount.compareTo(testAmount) == 0;
        boolean isAmountValid = isInternalBypass || isTestAmount || transferAmount.compareTo(payment.getAmount().subtract(new BigDecimal("100"))) >= 0;

        if (!isAmountValid) {
            log.warn("[SePay Webhook] Số tiền không khớp cho {}. Cần: {}, Nhận: {}", paymentCode, payment.getAmount(), transferAmount);
            payment.setStatus(PaymentStatus.FAILED);
            payment.setUpdatedAt(LocalDateTime.now());
            paymentRepository.save(payment);
            return;
        }

        // 7. Cập nhật Payment sang COMPLETED
        LocalDateTime now = LocalDateTime.now();
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setPaidAt(now);
        payment.setSepayTransactionId(transactionIdStr);
        payment.setSepayReferenceCode(payload.getReferenceCode());
        payment.setUpdatedAt(now);

        // 8. Tạo bản ghi Enrollment ACTIVE
        ClassGroup classGroup = classGroupRepository.findById(payment.getClassGroupId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));

        long currentStudents = enrollmentRepository.countByClassGroupIdAndStatus(classGroup.getId(), EnrollmentStatus.ACTIVE);
        BigDecimal discountRate = pricingService.discount(classGroup.getClassType(), currentStudents);

        Enrollment enrollment = Enrollment.builder()
                .studentId(payment.getStudentId())
                .classGroupId(classGroup.getId())
                .feeCharged(payment.getAmount())
                .discountRate(discountRate)
                .enrollmentSizeAtTime((int) currentStudents + 1)
                .status(EnrollmentStatus.ACTIVE)
                .enrolledAt(now)
                .build();
        enrollment = enrollmentRepository.save(enrollment);

        payment.setEnrollmentId(enrollment.getId());
        paymentRepository.save(payment);

        // 9. Kích hoạt LearningSchedule cho học viên
        LocalDate startDate = classGroup.getStartDate() != null ? classGroup.getStartDate() : LocalDate.now();
        LocalDate endDate = startDate.plusMonths(3);
        try {
            learningScheduleService.activate(enrollment.getId(), payment.getStudentId(), classGroup.getId(), startDate, endDate);
        } catch (Exception ex) {
            log.warn("[SePay Webhook] Không thể tự động kích hoạt lịch học LearningSchedule: {}", ex.getMessage());
        }

        log.info("[SePay Webhook] Xử lý thanh toán thành công cho mã {}. Enrollment ID: {}", paymentCode, enrollment.getId());
    }

    @Override
    @Transactional
    public PaymentIntentResponse bypassPayment(String paymentCode) {
        log.warn("[TEST] Bypassing SePay payment for code: {}", paymentCode);

        Payment payment = paymentRepository.findByPaymentCode(paymentCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));

        SepayWebhookDto mockDto = SepayWebhookDto.builder()
                .id(System.currentTimeMillis())
                .content(payment.getPaymentCode())
                .transferType("in")
                .transferAmount(payment.getAmount())
                .transactionDate(LocalDateTime.now().toString())
                .gateway("BYPASS_GATEWAY")
                .referenceCode("BYPASS-" + payment.getPaymentCode())
                .build();

        handleSepayWebhook(mockDto, null);

        Payment updated = paymentRepository.findByPaymentCode(payment.getPaymentCode()).orElse(payment);
        ClassGroup classGroup = classGroupRepository.findById(updated.getClassGroupId()).orElse(null);
        return mapToResponse(updated, classGroup, BigDecimal.ZERO);
    }

    private String generatePaymentCode() {
        String code;
        int attempts = 0;
        do {
            StringBuilder sb = new StringBuilder("VTT");
            for (int i = 0; i < 7; i++) {
                sb.append(CHARACTERS.charAt(RANDOM.nextInt(CHARACTERS.length())));
            }
            code = sb.toString();
            attempts++;
            if (attempts > 50) {
                code = "VTT" + System.currentTimeMillis();
                break;
            }
        } while (paymentRepository.existsByPaymentCode(code));
        return code;
    }

    private String buildVietQrUrl(String paymentCode, BigDecimal amount) {
        String bankBin = sepayProperties.getBankBin();
        String bankAccountNo = sepayProperties.getBankAccountNo();
        BigDecimal effectiveAmount = (sepayProperties.getTestAmount() != null)
                ? sepayProperties.getTestAmount()
                : amount;

        String encodedDes = URLEncoder.encode(paymentCode, StandardCharsets.UTF_8);
        return String.format(
                "https://qr.sepay.vn/img?bank=%s&acc=%s&template=compact&amount=%s&des=%s",
                bankBin, bankAccountNo, effectiveAmount.toPlainString(), encodedDes);
    }

    private PaymentIntentResponse mapToResponse(Payment payment, ClassGroup classGroup, BigDecimal discountRate) {
        return PaymentIntentResponse.builder()
                .paymentId(payment.getId())
                .paymentCode(payment.getPaymentCode())
                .classGroupId(payment.getClassGroupId())
                .classCode(classGroup != null ? classGroup.getClassCode() : null)
                .amount(payment.getAmount())
                .discountRate(discountRate)
                .qrImageUrl(payment.getQrImageUrl())
                .status(payment.getStatus())
                .expiresAt(payment.getExpiresAt())
                .createdAt(payment.getCreatedAt())
                .paidAt(payment.getPaidAt())
                .build();
    }
}
