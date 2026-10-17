package com.viettritutor.service;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.order.OrderResponse;
import com.viettritutor.entity.OrderRequestKey;
import com.viettritutor.repository.OrderRequestKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
@Service @RequiredArgsConstructor
public class OrderIdempotencyService {
 private final OrderRequestKeyRepository keys;
 private final PaymentIdempotencyService paymentKeys;
 private final ObjectMapper json;
 public void validate(String key){paymentKeys.validateKey(key);}
 // Caller holds the student lock for both replay and remember.
 public Optional<OrderResponse> replay(Long actor,String operation,String key,String request){
  return keys.findByActorIdAndOperationAndRequestKey(actor,operation,key).map(saved->{
   if(!saved.getFingerprint().equals(hash(request)))throw new BusinessException(ErrorCode.IDEMPOTENCY_CONFLICT);
   try{return json.readValue(saved.getResponse(),OrderResponse.class);}
   catch(JsonProcessingException e){throw new IllegalStateException("Cannot read order response",e);}
  });
 }
 public OrderResponse remember(Long actor,String operation,String key,String request,OrderResponse response){
  try{keys.saveAndFlush(OrderRequestKey.builder().actorId(actor).operation(operation).requestKey(key)
   .fingerprint(hash(request)).orderId(response.getId()).response(json.writeValueAsString(response)).build());return response;}
  catch(JsonProcessingException e){throw new IllegalStateException("Cannot save order response",e);}
 }
 private String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
  catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
}
