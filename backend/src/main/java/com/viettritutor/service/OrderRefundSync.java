package com.viettritutor.service;
import com.viettritutor.entity.Payment;
import com.viettritutor.enums.OrderStatus;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.math.BigDecimal;
@Service @RequiredArgsConstructor
public class OrderRefundSync {
 private final OrderRepository orders;
 private final PaymentRepository payments;
 @Transactional(propagation=Propagation.MANDATORY)
 public void refresh(Payment payment) {
  if(payment.getOrderId()==null)return;
  var order=orders.findForUpdate(payment.getOrderId()).orElseThrow();
  payments.flush();
  BigDecimal refunded=payments.findByOrderIdOrderById(order.getId()).stream().map(Payment::getRefundedAmount).reduce(BigDecimal.ZERO,BigDecimal::add);
  order.setRefundedAmount(refunded);
  order.setStatus(refunded.compareTo(order.getTotalAmount())==0?OrderStatus.REFUNDED:refunded.signum()>0?OrderStatus.PARTIALLY_REFUNDED:OrderStatus.PAID);
 }
}
