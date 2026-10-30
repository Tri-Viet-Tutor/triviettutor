package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.order.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final CartRepository carts;
    private final CartItemRepository cartItems;
    private final CourseRepository courses;
    private final PaymentRepository payments;
    private final PaymentIntentRepository intents;
    private final EnrollmentRepository enrollments;
    private final EnrollmentPaymentSupport support;
    private final LearningScheduleService learning;
    private final PaymentReadService paymentReads;
    private final OrderIdempotencyService idempotency;
    private final MockPaymentPolicy mockPolicy;
    private final MockPaymentGateway gateway;
    private final EntityManager entityManager;
    private final Clock clock;
    @Value("${app.orders.ttl-minutes:5}") private int ttlMinutes;

    @Transactional
    public OrderResponse checkout(CheckoutRequest input,String key,User student) {
        support.student(student);idempotency.validate(key);
        var selected=input.getItems();
        if(selected.stream().map(CheckoutRequest.Selection::getCartItemId).distinct().count()!=selected.size()
                || selected.stream().map(CheckoutRequest.Selection::getClassId).distinct().count()!=selected.size())
            throw new BusinessException(ErrorCode.INVALID_CHECKOUT);
        String fingerprint=input.getCartVersion()+":"+selected.stream()
                .sorted(Comparator.comparing(CheckoutRequest.Selection::getCartItemId))
                .map(i->i.getCartItemId()+"="+i.getClassId()).collect(Collectors.joining(","));
        var classes=lockClasses(selected.stream().map(CheckoutRequest.Selection::getClassId).toList());
        support.lockPeople(student.getId());
        var replay=idempotency.replay(student.getId(),"CHECKOUT",key,fingerprint);
        if(replay.isPresent())return replay.get();
        Cart cart=carts.findByStudentId(student.getId()).orElseThrow(()->new BusinessException(ErrorCode.CART_CHANGED));
        var current=cartItems.findByCartIdOrderById(cart.getId());
        if(cart.getVersion()!=input.getCartVersion() || current.size()!=selected.size()
                || !current.stream().map(CartItem::getId).collect(Collectors.toSet())
                    .equals(selected.stream().map(CheckoutRequest.Selection::getCartItemId).collect(Collectors.toSet())))
            throw new BusinessException(ErrorCode.CART_CHANGED);
        lockCourses(classes.values());
        Map<Long,CartItem> cartById=current.stream().collect(Collectors.toMap(CartItem::getId,i->i));
        Map<Long,EnrollmentPaymentSupport.Admission> admissions=admit(classes,student.getId());
        for(var selection:selected) {
            Course course=admissions.get(selection.getClassId()).course();
            if(!Objects.equals(course.getSubjectId(),cartById.get(selection.getCartItemId()).getSubjectId()))
                throw new BusinessException(ErrorCode.ORDER_SUBJECT_MISMATCH);
        }
        if(ttlMinutes<1 || ttlMinutes>1440)throw new IllegalStateException("Order TTL must be between 1 and 1440 minutes");
        OffsetDateTime now=now();
        // Mỗi lớp tính đúng giá học viên sẽ trả khi đăng ký lẻ (BR-02.11: giảm theo sĩ số lớp nhóm), chốt trong thời hạn đơn
        BigDecimal total=admissions.values().stream().map(EnrollmentPaymentSupport.Admission::expectedAmount).reduce(BigDecimal.ZERO,BigDecimal::add);
        PurchaseOrder order=orders.saveAndFlush(PurchaseOrder.builder().studentId(student.getId()).status(OrderStatus.PENDING_PAYMENT)
                .totalAmount(total).refundedAmount(BigDecimal.ZERO).cartVersion(cart.getVersion()).createdAt(now)
                .expiresAt(now.plusMinutes(ttlMinutes)).build());
        for(var selection:selected.stream().sorted(Comparator.comparing(CheckoutRequest.Selection::getCartItemId)).toList()) {
            ClassGroup group=classes.get(selection.getClassId());Course course=admissions.get(group.getId()).course();
            orderItems.save(OrderItem.builder().orderId(order.getId()).cartItemId(selection.getCartItemId())
                    .subjectId(course.getSubjectId()).courseId(course.getId()).classId(group.getId())
                    .subjectName(course.getSubject()).courseName(course.getName()).classCode(group.getClassCode())
                    .unitPrice(admissions.get(group.getId()).expectedAmount()).build());
        }
        orderItems.flush();
        return idempotency.remember(student.getId(),"CHECKOUT",key,fingerprint,response(order));
    }

    @Transactional
    public OrderResponse pay(Long orderId,String key,User student) {
        support.student(student);idempotency.validate(key);mockPolicy.requireEnabled();
        PurchaseOrder order=find(orderId);support.owner(order.getStudentId(),student);
        var items=orderItems.findByOrderIdOrderById(orderId);
        var classes=lockClasses(items.stream().map(OrderItem::getClassId).toList());
        support.lockPeople(student.getId());
        order=lockOrder(order);
        // Items may have been loaded before a concurrent payment committed.
        items.forEach(entityManager::refresh);
        var replay=idempotency.replay(student.getId(),"PAY",key,orderId.toString());
        if(replay.isPresent())return replay.get();
        if(order.getPaidAt()!=null)return idempotency.remember(student.getId(),"PAY",key,orderId.toString(),response(order));
        requirePending(order);
        lockCourses(classes.values());
        var admissions=admit(classes,student.getId());
        for(OrderItem item:items) {
            var course=admissions.get(item.getClassId()).course();
            if(!item.getCourseId().equals(course.getId()) || !item.getSubjectId().equals(course.getSubjectId()))
                throw new BusinessException(ErrorCode.ORDER_SUBJECT_MISMATCH);
        }
        boolean success=gateway.confirm();
        OffsetDateTime now=now();
        for(OrderItem item:items) {
            var admission=admissions.get(item.getClassId());
            PaymentIntent intent=intents.saveAndFlush(PaymentIntent.builder().studentId(student.getId())
                    .classGroupId(item.getClassId()).courseId(item.getCourseId()).amount(item.getUnitPrice())
                    .status(success?PaymentIntentStatus.COMPLETED:PaymentIntentStatus.FAILED)
                    .createdAt(now).expiresAt(now.plusMinutes(ttlMinutes)).build());
            Payment payment=payments.saveAndFlush(Payment.builder().intentId(intent.getId()).studentId(student.getId())
                    .classGroupId(item.getClassId()).orderId(orderId).orderItemId(item.getId()).amount(item.getUnitPrice())
                    .refundedAmount(BigDecimal.ZERO).method("MOCK").status(success?PaymentStatus.COMPLETED:PaymentStatus.FAILED)
                    .transactionRef("MOCK-ORDER-"+UUID.randomUUID()).createdAt(now).paidAt(success?now:null).build());
            if(success) {
                Enrollment enrollment=enrollments.saveAndFlush(Enrollment.builder().studentId(student.getId())
                        .classGroupId(item.getClassId()).paymentId(payment.getId()).feeCharged(item.getUnitPrice())
                        .discountRate(discountOf(item.getUnitPrice(),admission.course().priceFor(admission.sessions().size())))
                        .enrollmentSizeAtTime(admission.enrollmentSize())
                        .status(EnrollmentStatus.ACTIVE).enrolledAt(now).build());
                learning.activate(enrollment.getId(),student.getId(),item.getClassId(),admission.start(),admission.end());
                item.setPaymentId(payment.getId());item.setEnrollmentId(enrollment.getId());
            }
        }
        if(success) {
            order.setStatus(OrderStatus.PAID);order.setPaidAt(now);
            removePurchasedCartItems(student.getId(),items);
        }
        entityManager.flush();
        return idempotency.remember(student.getId(),"PAY",key,orderId.toString(),response(order));
    }

    /** Mức giảm thực tế của giá đã chốt trong đơn so với học phí gốc 1 kèm 1 (0..1, 3 chữ số thập phân). */
    private static BigDecimal discountOf(BigDecimal unitPrice,BigDecimal basePrice) {
        if(basePrice==null || basePrice.signum()<=0 || unitPrice.compareTo(basePrice)>=0)return BigDecimal.ZERO;
        return BigDecimal.ONE.subtract(unitPrice.divide(basePrice,3,java.math.RoundingMode.HALF_UP)).max(BigDecimal.ZERO);
    }

    @Transactional
    public OrderResponse cancel(Long orderId,String reason,String key,User student) {
        support.student(student);idempotency.validate(key);support.lockPeople(student.getId());
        PurchaseOrder order=find(orderId);support.owner(order.getStudentId(),student);order=lockOrder(order);
        String request=orderId+":"+reason.trim();
        var replay=idempotency.replay(student.getId(),"CANCEL",key,request);if(replay.isPresent())return replay.get();
        if(order.getStatus()==OrderStatus.CANCELLED) {
            if(!order.getCancellationReason().equals(reason.trim()))throw new BusinessException(ErrorCode.ORDER_CANCEL_CONFLICT);
        } else {
            requirePending(order);order.setStatus(OrderStatus.CANCELLED);order.setCancelledAt(now());order.setCancellationReason(reason.trim());
        }
        return idempotency.remember(student.getId(),"CANCEL",key,request,response(order));
    }

    @Transactional(readOnly=true)
    public OrderResponse detail(Long id,User actor) {
        PurchaseOrder order=find(id);
        if("ROLE_ADMIN".equals(actor.getRole()))support.admin(actor);
        else {support.student(actor);support.owner(order.getStudentId(),actor);}
        return response(order);
    }

    @Transactional(readOnly=true)
    public PageResponse<OrderResponse> list(User actor,boolean admin,Long studentId,OrderStatus status,LocalDate from,LocalDate to,int page,int size) {
        if(admin)support.admin(actor);else {support.student(actor);studentId=actor.getId();}
        if(page<0 || size<1 || size>100)throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        if(from!=null && to!=null && from.isAfter(to))throw new BusinessException(ErrorCode.INVALID_DATE_RANGE);
        if(to!=null && to.equals(LocalDate.MAX))throw new BusinessException(ErrorCode.INVALID_DATE_RANGE);
        final Long owner=studentId;OffsetDateTime instant=now();
        return PageResponse.from(orders.findAll((root,query,cb)->{
            List<Predicate> filters=new ArrayList<>();
            if(owner!=null)filters.add(cb.equal(root.get("studentId"),owner));
            if(status==OrderStatus.EXPIRED)filters.add(cb.or(cb.equal(root.get("status"),status),
                    cb.and(cb.equal(root.get("status"),OrderStatus.PENDING_PAYMENT),cb.lessThanOrEqualTo(root.get("expiresAt"),instant))));
            else if(status!=null) {
                filters.add(cb.equal(root.get("status"),status));
                if(status==OrderStatus.PENDING_PAYMENT)filters.add(cb.greaterThan(root.get("expiresAt"),instant));
            }
            if(from!=null)filters.add(cb.greaterThanOrEqualTo(root.get("createdAt"),from.atStartOfDay(clock.getZone()).toOffsetDateTime()));
            if(to!=null)filters.add(cb.lessThan(root.get("createdAt"),to.plusDays(1).atStartOfDay(clock.getZone()).toOffsetDateTime()));
            return cb.and(filters.toArray(Predicate[]::new));
        },PageRequest.of(page,size,Sort.by("id").descending())).map(this::response));
    }

    private Map<Long,ClassGroup> lockClasses(Collection<Long> ids) {
        Map<Long,ClassGroup> result=new LinkedHashMap<>();
        ids.stream().distinct().sorted().forEach(id->{var c=support.lockClass(id);entityManager.refresh(c,LockModeType.PESSIMISTIC_WRITE);result.put(id,c);});
        return result;
    }
    private void lockCourses(Collection<ClassGroup> classes) {
        classes.stream().map(ClassGroup::getCourseId).filter(Objects::nonNull).distinct().sorted().forEach(id->{
            var c=courses.findForUpdate(id).orElseThrow(()->new BusinessException(ErrorCode.CLASS_PAYMENT_NOT_READY));
            entityManager.refresh(c,LockModeType.PESSIMISTIC_WRITE);
        });
    }
    private Map<Long,EnrollmentPaymentSupport.Admission> admit(Map<Long,ClassGroup> classes,Long student) {
        Map<Long,EnrollmentPaymentSupport.Admission> result=new LinkedHashMap<>();
        List<Session> selected=new ArrayList<>();
        for(var group:classes.values()) {
            var admission=support.admission(group,student);
            for(var a:admission.sessions())for(var b:selected) {
                if(a.getSessionDate().equals(b.getSessionDate()) && a.getStartTime().isBefore(b.getEndTime()) && b.getStartTime().isBefore(a.getEndTime()))
                    throw new BusinessException(ErrorCode.STUDENT_SCHEDULE_CONFLICT);
            }
            selected.addAll(admission.sessions());result.put(group.getId(),admission);
        }
        return result;
    }
    private PurchaseOrder lockOrder(PurchaseOrder order) {
        orders.findForUpdate(order.getId()).orElseThrow();entityManager.refresh(order,LockModeType.PESSIMISTIC_WRITE);return order;
    }
    private PurchaseOrder find(Long id){return orders.findById(id).orElseThrow(()->new BusinessException(ErrorCode.ORDER_NOT_FOUND));}
    private void requirePending(PurchaseOrder order) {
        if(order.getStatus()==OrderStatus.EXPIRED || (order.getStatus()==OrderStatus.PENDING_PAYMENT && !clock.instant().isBefore(order.getExpiresAt().toInstant())))
            throw new BusinessException(ErrorCode.ORDER_EXPIRED);
        if(order.getStatus()!=OrderStatus.PENDING_PAYMENT)throw new BusinessException(ErrorCode.ORDER_NOT_PENDING);
    }
    private void removePurchasedCartItems(Long student,List<OrderItem> purchased) {
        var cart=carts.findByStudentId(student);if(cart.isEmpty())return;
        Set<Long> bought=purchased.stream().map(OrderItem::getCartItemId).collect(Collectors.toSet());
        var removed=cartItems.findByCartIdOrderById(cart.get().getId()).stream().filter(i->bought.contains(i.getId())).toList();
        if(!removed.isEmpty()){cartItems.deleteAll(removed);cart.get().setVersion(cart.get().getVersion()+1);}
    }
    private OrderResponse response(PurchaseOrder order) {
        OrderStatus status=order.getStatus();
        if(status==OrderStatus.PENDING_PAYMENT && !clock.instant().isBefore(order.getExpiresAt().toInstant()))status=OrderStatus.EXPIRED;
        return OrderResponse.builder().id(order.getId()).studentId(order.getStudentId()).status(status)
                .totalAmount(order.getTotalAmount()).refundedAmount(order.getRefundedAmount()).currency("VND").cartVersion(order.getCartVersion())
                .createdAt(order.getCreatedAt()).expiresAt(order.getExpiresAt()).paidAt(order.getPaidAt()).cancelledAt(order.getCancelledAt())
                .cancellationReason(order.getCancellationReason()).items(orderItems.findByOrderIdOrderById(order.getId()).stream().map(i->
                        OrderResponse.Item.builder().id(i.getId()).cartItemId(i.getCartItemId()).subjectId(i.getSubjectId()).courseId(i.getCourseId())
                                .classId(i.getClassId()).subjectName(i.getSubjectName()).courseName(i.getCourseName()).classCode(i.getClassCode())
                                .unitPrice(i.getUnitPrice()).paymentId(i.getPaymentId()).enrollmentId(i.getEnrollmentId()).build()).toList())
                .payments(payments.findByOrderIdOrderById(order.getId()).stream().map(paymentReads::response).toList()).build();
    }
    private OffsetDateTime now(){return OffsetDateTime.ofInstant(clock.instant().truncatedTo(ChronoUnit.MICROS),ZoneOffset.UTC);}
}
