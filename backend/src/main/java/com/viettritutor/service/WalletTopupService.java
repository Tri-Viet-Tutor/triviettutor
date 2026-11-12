package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.config.*;
import com.viettritutor.dto.payment.VnpayIpnResponse;
import com.viettritutor.dto.wallet.*;
import com.viettritutor.entity.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import org.springframework.util.MultiValueMap;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public interface WalletTopupService {

    WalletTopupResponse create(BigDecimal amount, String key, User student, String origin, String clientIp);
    WalletTopupResponse detail(Long id, User student, String clientIp);
    WalletTopupResponse returned(MultiValueMap<String, String> input, User student, String clientIp);
    VnpayIpnResponse ipn(MultiValueMap<String, String> input);
/**
     * Recovers a top-up whose IPN never reached this backend (sleeping host, wrong IPN URL, outdated deploy).
     * Asks VNPay querydr for the signed transaction result and settles it through the same checks as the IPN.
     * Only a confirmed payment changes state; a pending or unknown result leaves the top-up untouched.
     */
    WalletTopupResponse reconcile(Long id, User student, String clientIp);
}
