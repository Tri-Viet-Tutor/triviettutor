package com.viettritutor.controller;
import com.viettritutor.common.api.*;
import com.viettritutor.dto.order.*;
import com.viettritutor.entity.User;
import com.viettritutor.enums.OrderStatus;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.OrderService;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor @Validated
@Tag(name="Multi-class orders",description="Full course prices in VND. Checkout holds prices for 5 minutes by default, without reserving seats.")
public class OrderController {
 private final OrderService orders;
 @PostMapping("/orders/checkout") @PreAuthorize("hasRole('STUDENT')")
 @Operation(summary="Choose a class for every cart subject and create an order",description="Requires current cartVersion, all cartItemId/classId pairs and Idempotency-Key. No client prices or discounts. All selected classes must have compatible schedules.")
 public ApiResponse<OrderResponse> checkout(@Valid @RequestBody CheckoutRequest input,
   @Parameter(required=true) @RequestHeader(value="Idempotency-Key",required=false) String key,@CurrentUser User student){return ApiResponse.ok(orders.checkout(input,key,student));}
 @GetMapping("/orders/my") @PreAuthorize("hasRole('STUDENT')") @Operation(summary="List my orders")
 public ApiResponse<PageResponse<OrderResponse>> mine(@CurrentUser User student,
   @RequestParam(required=false) OrderStatus status,
   @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
   @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
   @RequestParam(defaultValue="0") @Min(0) int page,@RequestParam(defaultValue="20") @Min(1) @Max(100) int size){
  return ApiResponse.ok(orders.list(student,false,null,status,from,to,page,size));}
 @GetMapping("/orders/{orderId}") @PreAuthorize("hasAnyRole('ADMIN','STUDENT')") @Operation(summary="Read an order, its price snapshots, payments and enrollment IDs")
 public ApiResponse<OrderResponse> detail(@PathVariable @Positive Long orderId,@CurrentUser User actor){return ApiResponse.ok(orders.detail(orderId,actor));}
 @PostMapping("/orders/{orderId}/payments/mock") @PreAuthorize("hasRole('STUDENT')")
 @Operation(summary="Pay for all order items using the configured mock gateway",description="Requires Idempotency-Key and enabled mock payments in dev/demo/test. No request body. Rechecks capacity and schedules. A successful transaction enrolls every class; failure enrolls none.")
 public ApiResponse<OrderResponse> pay(@PathVariable @Positive Long orderId,
   @Parameter(required=true) @RequestHeader(value="Idempotency-Key",required=false) String key,@CurrentUser User student){return ApiResponse.ok(orders.pay(orderId,key,student));}
 @PostMapping("/orders/{orderId}/cancel") @PreAuthorize("hasRole('STUDENT')") @Operation(summary="Cancel an owned pending order before expiry")
 public ApiResponse<OrderResponse> cancel(@PathVariable @Positive Long orderId,@Valid @RequestBody CancelOrderRequest input,
   @Parameter(required=true) @RequestHeader(value="Idempotency-Key",required=false) String key,@CurrentUser User student){return ApiResponse.ok(orders.cancel(orderId,input.getReason(),key,student));}
 @GetMapping("/admin/orders") @PreAuthorize("hasRole('ADMIN')") @Operation(summary="Search all orders by student, status and creation date",description="from/to dates are inclusive in the application timezone. Newest orders first.")
 public ApiResponse<PageResponse<OrderResponse>> all(@CurrentUser User admin,
   @RequestParam(required=false) @Positive Long studentId,@RequestParam(required=false) OrderStatus status,
   @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
   @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
   @RequestParam(defaultValue="0") @Min(0) int page,@RequestParam(defaultValue="20") @Min(1) @Max(100) int size){
  return ApiResponse.ok(orders.list(admin,true,studentId,status,from,to,page,size));}
}
