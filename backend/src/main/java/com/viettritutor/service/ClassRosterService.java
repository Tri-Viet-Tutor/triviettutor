package com.viettritutor.service;

import com.viettritutor.dto.roster.*;
import com.viettritutor.entity.*;
import com.viettritutor.repository.*;
import java.util.*;

public interface ClassRosterService {

    ClassRosterResponse getClassRoster(Long classGroupId, User actor);
    SessionRosterResponse getSessionRoster(Long sessionId, User actor);
}
