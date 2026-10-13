package com.viettritutor.dto.payment;

import com.fasterxml.jackson.annotation.JsonProperty;

public record VnpayIpnResponse(@JsonProperty("RspCode") String code, @JsonProperty("Message") String message) {}
