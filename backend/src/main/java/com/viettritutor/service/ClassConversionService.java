package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.catalog.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import java.time.*;
import java.util.*;

public interface ClassConversionService {

    ConversionResponse convert(Long id, ConvertClassRequest request, User actor);
}
