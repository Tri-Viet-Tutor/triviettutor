package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import java.util.*;

public interface VnpayApiClient {

    Map<String, String> exchange(Map<String, String> fields, String signingData, String command);
public static String join(Map<String, String> fields, List<String> keys) {
        return String.join("|", keys.stream().map(key -> fields.getOrDefault(key, "")).toList());
    }
}
