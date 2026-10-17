package com.viettritutor.controller;
import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.order.*;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/cart") @RequiredArgsConstructor @Validated
@PreAuthorize("hasRole('STUDENT')") @Tag(name="Shopping cart",description="One subject per item. Choose a concrete class at checkout.")
public class CartController {
 private final CartService cart;
 @GetMapping @Operation(summary="Read my cart and its current version")
 public ApiResponse<CartResponse> get(@CurrentUser User student){return ApiResponse.ok(cart.get(student));}
 @PostMapping("/items") @Operation(summary="Add a subject to my cart",description="Use subjectId from the class catalog. Adding an existing subject keeps the same item and version.")
 public ApiResponse<CartResponse> add(@Valid @RequestBody AddCartItemRequest request,@CurrentUser User student){return ApiResponse.ok(cart.add(request.getSubjectId(),student));}
 @DeleteMapping("/items/{itemId}") @Operation(summary="Remove an owned cart item")
 public ApiResponse<CartResponse> remove(@PathVariable @Positive Long itemId,@CurrentUser User student){return ApiResponse.ok(cart.remove(itemId,student));}
 @DeleteMapping("/items") @Operation(summary="Clear my cart")
 public ApiResponse<CartResponse> clear(@CurrentUser User student){return ApiResponse.ok(cart.clear(student));}
}
