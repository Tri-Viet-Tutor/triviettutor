package com.viettritutor.service;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.order.CartResponse;
import com.viettritutor.entity.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
@Service @RequiredArgsConstructor
public class CartService {
 private final CartRepository carts;
 private final CartItemRepository items;
 private final SubjectRepository subjects;
 private final EnrollmentPaymentSupport support;
 private final Clock clock;
 @Transactional(readOnly=true) public CartResponse get(User student) {
  support.student(student);
  return carts.findByStudentId(student.getId()).map(this::response)
   .orElseGet(()->CartResponse.builder().cartVersion(0).items(List.of()).build());
 }
 @Transactional public CartResponse add(Long subjectId,User student) {
  support.student(student);support.lockPeople(student.getId());
  if(!subjects.existsById(subjectId))throw new BusinessException(ErrorCode.SUBJECT_NOT_FOUND);
  Cart cart=carts.findByStudentId(student.getId()).orElseGet(()->carts.saveAndFlush(Cart.builder().studentId(student.getId()).build()));
  var current=items.findByCartIdOrderById(cart.getId());
  if(current.stream().anyMatch(i->i.getSubjectId().equals(subjectId)))return response(cart);
  if(current.size()>=20)throw new BusinessException(ErrorCode.CART_LIMIT_EXCEEDED);
  items.saveAndFlush(CartItem.builder().cartId(cart.getId()).subjectId(subjectId)
   .addedAt(OffsetDateTime.ofInstant(clock.instant().truncatedTo(ChronoUnit.MICROS),ZoneOffset.UTC)).build());
  cart.setVersion(cart.getVersion()+1);return response(cart);
 }
 @Transactional public CartResponse remove(Long itemId,User student) {
  support.student(student);support.lockPeople(student.getId());
  CartItem item=items.findById(itemId).orElseThrow(()->new BusinessException(ErrorCode.CART_ITEM_NOT_FOUND));
  Cart cart=carts.findById(item.getCartId()).orElseThrow();support.owner(cart.getStudentId(),student);
  items.delete(item);items.flush();cart.setVersion(cart.getVersion()+1);return response(cart);
 }
 @Transactional public CartResponse clear(User student) {
  support.student(student);support.lockPeople(student.getId());
  var found=carts.findByStudentId(student.getId());if(found.isEmpty())return get(student);
  Cart cart=found.get();var current=items.findByCartIdOrderById(cart.getId());
  if(!current.isEmpty()){items.deleteAll(current);items.flush();cart.setVersion(cart.getVersion()+1);}return response(cart);
 }
 private CartResponse response(Cart cart) {
  var rows=items.findByCartIdOrderById(cart.getId());
  var names=subjects.findAllById(rows.stream().map(CartItem::getSubjectId).toList()).stream()
   .collect(Collectors.toMap(Subject::getId,Subject::getName));
  return CartResponse.builder().id(cart.getId()).cartVersion(cart.getVersion()).items(rows.stream()
   .map(i->CartResponse.Item.builder().id(i.getId()).subjectId(i.getSubjectId()).subjectName(names.get(i.getSubjectId())).addedAt(i.getAddedAt()).build()).toList()).build();
 }
}
