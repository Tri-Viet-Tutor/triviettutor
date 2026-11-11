package com.viettritutor.service;
import com.viettritutor.service.impl.VnpayApiClientImpl;

import com.viettritutor.config.VnpayProperties;
import com.viettritutor.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

/** Generated fixture credentials only; never calls the real provider. */
class VnpayProtocolTest {
    VnpayProperties properties() {
        var p=new VnpayProperties(); p.setEnabled(true); p.setTmnCode("TEST0001");
        p.setHashSecret(UUID.randomUUID().toString()); p.setPaymentUrl("https://gateway.test.invalid/pay");
        p.setApiUrl("https://gateway.test.invalid/api"); p.setTimeoutSeconds(10); p.setReturnPath("/student/checkout");
        return p;
    }
    @Test void enabledConfigurationFailsEarlyWithoutExposingSecret() {
        var p=properties(); p.setTmnCode(""); p.setPaymentUrl("http://gateway.test.invalid/pay");
        assertThatThrownBy(p::validateConfiguration).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("VNPAY_TMN_CODE").hasMessageContaining("VNPAY_PAYMENT_URL")
                .hasMessageNotContaining(p.getHashSecret());
        p.setEnabled(false); assertThatCode(p::validateConfiguration).doesNotThrowAnyException();
        assertThatThrownBy(p::requireEnabled).isInstanceOf(BusinessException.class);
    }
    @Test void returnOriginsAreExactAndCannotBeUsedForAnOpenRedirect() {
        var p=properties(); var urls=new VnpayReturnUrl("https://member.test.invalid", "https://frontend.test.invalid",p);
        assertThat(urls.resolve(null)).isEqualTo("https://frontend.test.invalid/student/checkout");
        assertThat(urls.resolve("https://member.test.invalid")).isEqualTo("https://member.test.invalid/student/checkout");
        for(String origin:List.of("https://attacker.test.invalid","https://member.test.invalid.evil.invalid","https://member.test.invalid/path"))
            assertThatThrownBy(()->urls.resolve(origin)).isInstanceOf(BusinessException.class);
        p.setReturnPath("//attacker.test.invalid"); assertThatThrownBy(()->urls.resolve(null)).isInstanceOf(BusinessException.class);
    }
    @Test void unicodeFieldsUseUtf8AndDuplicateParametersAreRejected() {
        var signature=new VnpaySignature(properties());
        assertThat(signature.query(Map.of("vnp_OrderInfo","Học phí lớp")))
                .isEqualTo("vnp_OrderInfo=H%E1%BB%8Dc+ph%C3%AD+l%E1%BB%9Bp");
        var input=new LinkedMultiValueMap<String,String>(); input.add("vnp_TmnCode","TEST0001");
        input.add("vnp_TxnRef","fixture1"); input.add("vnp_Amount","10000000");
        input.add("vnp_SecureHash",signature.hash(signature.query(input.toSingleValueMap())));
        assertThat(signature.verified(input)).containsEntry("vnp_TxnRef","fixture1");
        input.add("vnp_Amount","1"); assertThatThrownBy(()->signature.verified(input)).isInstanceOf(BusinessException.class);
    }
    @Test void providerApiRejectsWrongSignatureMerchantReferenceAndCommand() {
        var p=properties(); var signature=new VnpaySignature(p);
        Map<String,String> fields=Map.of("vnp_TxnRef","fixture1");
        List<String> keys=List.of("vnp_ResponseId","vnp_Command","vnp_ResponseCode","vnp_Message","vnp_TmnCode",
                "vnp_TxnRef","vnp_Amount","vnp_BankCode","vnp_PayDate","vnp_TransactionNo","vnp_TransactionType",
                "vnp_TransactionStatus","vnp_OrderInfo");
        var response=new HashMap<String,Object>(); response.put("vnp_ResponseId","reply1"); response.put("vnp_Command","refund");
        response.put("vnp_ResponseCode","00");response.put("vnp_TmnCode","TEST0001");response.put("vnp_TxnRef","fixture1");
        VnpayApiClient client=new VnpayApiClientImpl(p,signature) {
            @Override protected Map<String,Object> post(Map<String,String> body) {
                assertThat(body.get("vnp_SecureHash")).isEqualTo(signature.hash("request-signing-data"));
                return response;
            }
        };
        sign(response,keys,signature);
        assertThat(client.exchange(fields,"request-signing-data","refund")).containsEntry("vnp_ResponseCode","00");
        response.put("vnp_Amount","1");
        assertThatThrownBy(()->client.exchange(fields,"request-signing-data","refund")).isInstanceOf(BusinessException.class);
        for(String field:List.of("vnp_TmnCode","vnp_TxnRef","vnp_Command")) {
            Object original=response.put(field,"wrong"); sign(response,keys,signature);
            assertThatThrownBy(()->client.exchange(fields,"request-signing-data","refund")).isInstanceOf(BusinessException.class);
            response.put(field,original);
        }
    }
    void sign(Map<String,Object> response,List<String> keys,VnpaySignature signature) {
        Map<String,String> strings=new HashMap<>(); response.forEach((k,v)->strings.put(k,v.toString()));
        response.put("vnp_SecureHash",signature.hash(VnpayApiClient.join(strings,keys)));
    }
}
