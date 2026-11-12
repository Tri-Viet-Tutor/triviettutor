package com.viettritutor.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.viettritutor.entity.User;
import com.viettritutor.repository.CourseRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-courses;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false",
        "spring.flyway.enabled=false", "spring.mail.username=test@example.test", "spring.mail.password=test",
        "app.jwt.secret=course-test-secret-with-at-least-thirty-two-bytes"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class CourseControllerTest {
    private static final String BASE = "/api/v1/admin/courses";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired CourseRepository courses;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    private String admin;

    @BeforeEach
    void setUp() {
        admin = bearer("ADMIN");
    }

    @Test
    void createDefaultsAndPersistsNormalizedValues() throws Exception {
        Map<String, Object> body = valid();
        body.put("name", "  Toan lop 10  ");
        body.put("subject", " math ");
        body.remove("durationMinutes");
        JsonNode created = create(body);
        assertEquals("Toan lop 10", created.get("name").asText());
        assertEquals("MATH", created.get("subject").asText());
        assertEquals(120, created.get("durationMinutes").asInt());
        assertTrue(created.get("active").asBoolean());
        assertFalse(created.get("createdAt").asText().isBlank());
        var stored = courses.findById(created.get("id").asLong()).orElseThrow();
        assertEquals("Toan lop 10", stored.getName());
        assertEquals(0, stored.getBasePrice1on1().compareTo(new java.math.BigDecimal("8000000")));
    }

    @Test
    void updateReplacesEditableFieldsAndPreservesVisibilityAndCreationTime() throws Exception {
        JsonNode created = create(valid());
        long id = created.get("id").asLong();
        entityManager.clear(); // Exercise the database timestamp precision, not the first-level cache.
        mvc.perform(patch(BASE + "/" + id + "/toggle").header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.active").value(false));
        Map<String, Object> replacement = valid();
        replacement.put("name", "Updated course");
        replacement.put("subject", "PHYSICS");
        replacement.put("gradeLevel", "GRADE_12");
        replacement.put("basePrice1on1", 9000000);
        replacement.put("totalSessions", 40);
        replacement.put("durationMinutes", 120);
        replacement.remove("description");
        mvc.perform(put(BASE + "/" + id).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(replacement)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.name").value("Updated course"))
                .andExpect(jsonPath("$.data.gradeLevel").value("GRADE_12"))
                .andExpect(jsonPath("$.data.basePrice1on1").value(9000000))
                .andExpect(jsonPath("$.data.totalSessions").value(40))
                .andExpect(jsonPath("$.data.durationMinutes").value(120))
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.createdAt").value(created.get("createdAt").asText()));
        var stored = courses.findById(id).orElseThrow();
        assertEquals("PHYSICS", stored.getSubject());
        assertNull(stored.getDescription());
        assertFalse(stored.isActive());
    }

    @Test
    void toggleTwiceRestoresVisibilityWithoutChangingCourseDetails() throws Exception {
        long id = create(valid()).get("id").asLong();
        for (boolean active : new boolean[]{false, true}) {
            mvc.perform(patch(BASE + "/" + id + "/toggle").header("Authorization", admin))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.active").value(active))
                    .andExpect(jsonPath("$.data.name").value("Toan lop 10"));
            assertEquals(active, courses.findById(id).orElseThrow().isActive());
        }
    }

    @Test
    void listCombinesFiltersAndPaginatesInStableIdOrder() throws Exception {
        long first = create(valid()).get("id").asLong();
        Map<String, Object> other = valid();
        other.put("subject", "PHYSICS");
        long second = create(other).get("id").asLong();
        mvc.perform(patch(BASE + "/" + first + "/toggle").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get(BASE).header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.page").value(0)).andExpect(jsonPath("$.data.size").value(20));
        mvc.perform(get(BASE).header("Authorization", admin).param("page", "1").param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.content[0].id").value(second))
                .andExpect(jsonPath("$.data.totalPages").value(2));
        mvc.perform(get(BASE).header("Authorization", admin).param("subject", " math ")
                        .param("gradeLevel", "GRADE_10").param("active", "false"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(first));
        mvc.perform(get(BASE).header("Authorization", admin).param("subject", "MATH").param("active", "true"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(0));
        mvc.perform(get(BASE).header("Authorization", admin).param("page", "10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.content").isEmpty());
    }

    @ParameterizedTest
    @CsvSource({"page,-1", "size,0", "size,101", "page,abc", "gradeLevel,GRADE_13", "active,invalid"})
    void rejectsInvalidFilters(String key, String value) throws Exception {
        mvc.perform(get(BASE).header("Authorization", admin).param(key, value))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false));
    }

    static Stream<Map<String, Object>> invalidBodies() {
        var cases = new java.util.ArrayList<Map<String, Object>>();
        // totalSessions không còn bắt buộc: số buổi đặt ở từng lớp
        for (String key : new String[]{"name", "subject", "gradeLevel", "basePrice1on1"}) {
            var missing = valid(); missing.remove(key); cases.add(missing);
        }
        for (String key : new String[]{"name", "subject", "gradeLevel", "basePrice1on1", "durationMinutes"}) {
            var missing = valid(); missing.put(key, null); cases.add(missing);
        }
        Object[][] values = {
                {"name", "  "}, {"name", "a".repeat(201)}, {"subject", "  "}, {"subject", "a".repeat(101)},
                {"gradeLevel", "GRADE_13"}, {"gradeLevel", 1},
                {"basePrice1on1", 0}, {"basePrice1on1", -1}, {"basePrice1on1", 1.5},
                {"basePrice1on1", "1000000000000000"}, {"totalSessions", 0}, {"totalSessions", -1},
                {"totalSessions", 1.5}, {"totalSessions", 2147483648L},
                {"durationMinutes", 0}, {"durationMinutes", -1}, {"durationMinutes", 1.5},
                {"basePrice1on1", 99999}, {"totalSessions", 201}, {"durationMinutes", 29}, {"durationMinutes", 150},
                {"description", "a".repeat(10001)}, {"active", false}, {"id", 99}
        };
        for (Object[] pair : values) {
            var body = valid(); body.put((String) pair[0], pair[1]); cases.add(body);
        }
        return cases.stream();
    }

    @ParameterizedTest
    @MethodSource("invalidBodies")
    void rejectsInvalidCreateAndUpdateWithoutMutatingData(Map<String, Object> body) throws Exception {
        long id = create(valid()).get("id").asLong();
        long before = courses.count();
        mvc.perform(post(BASE).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        mvc.perform(put(BASE + "/" + id).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        assertEquals(before, courses.count());
        assertEquals("Toan lop 10", courses.findById(id).orElseThrow().getName());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "{", "[]", "null"})
    void rejectsMalformedBody(String body) throws Exception {
        mvc.perform(post(BASE).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"TUTOR", "STUDENT", "ANONYMOUS", "INVALID_TOKEN"})
    void enforcesAccessForEveryEndpoint(String role) throws Exception {
        long id = create(valid()).get("id").asLong();
        String token = role.equals("ANONYMOUS") ? "" : role.equals("INVALID_TOKEN") ? "Bearer invalid" : bearer(role);
        int expected = role.equals("TUTOR") || role.equals("STUDENT") ? 403 : 401;
        for (String method : new String[]{"GET", "POST", "PUT", "PATCH"}) {
            String path = BASE + (method.equals("PUT") ? "/" + id : method.equals("PATCH") ? "/" + id + "/toggle" : "");
            mvc.perform(request(HttpMethod.valueOf(method), path).header("Authorization", token)
                            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(valid())))
                    .andExpect(status().is(expected)).andExpect(jsonPath("$.success").value(false));
        }
        assertEquals(1, courses.count());
        assertTrue(courses.findById(id).orElseThrow().isActive());
    }

    @Test
    void missingCoursesReturn404AndInvalidIdsReturn400() throws Exception {
        for (String id : new String[]{"999999", "0", "-1", "abc"}) {
            int expected = id.equals("999999") ? 404 : 400;
            ResultActions update = mvc.perform(put(BASE + "/" + id).header("Authorization", admin)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(valid())));
            update.andExpect(status().is(expected));
            ResultActions toggle = mvc.perform(patch(BASE + "/" + id + "/toggle").header("Authorization", admin));
            toggle.andExpect(status().is(expected));
            if (expected == 404) {
                update.andExpect(jsonPath("$.errorCode").value("COURSE_NOT_FOUND"));
                toggle.andExpect(jsonPath("$.errorCode").value("COURSE_NOT_FOUND"));
            }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"GRADE_10", "GRADE_11", "GRADE_12"})
    void acceptsAllHighSchoolGrades(String grade) throws Exception {
        var body = valid();
        body.put("gradeLevel", grade);
        long id = create(body).get("id").asLong();
        mvc.perform(put(BASE + "/" + id).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.gradeLevel").value(grade));
        mvc.perform(get(BASE).header("Authorization", admin).param("gradeLevel", grade))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].gradeLevel").value(grade));
    }

    @ParameterizedTest
    @ValueSource(strings = {"GRADE_1", "GRADE_2", "GRADE_3", "GRADE_4", "GRADE_5",
            "GRADE_6", "GRADE_7", "GRADE_8", "GRADE_9"})
    void rejectsLowerGradesOnCreateUpdateAndFilter(String grade) throws Exception {
        long id = create(valid()).get("id").asLong();
        var body = valid(); body.put("gradeLevel", grade);
        mvc.perform(post(BASE).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
        mvc.perform(put(BASE + "/" + id).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
        mvc.perform(get(BASE).header("Authorization", admin).param("gradeLevel", grade))
                .andExpect(status().isBadRequest());
        assertEquals(1, courses.count());
        assertEquals("GRADE_10", courses.findById(id).orElseThrow().getGradeLevel().name());
    }

    @Test
    void responseCarriesPricePerStudentForEveryClassSizeTier() throws Exception {
        JsonNode tiers = create(valid()).get("priceTiers");
        assertEquals(4, tiers.size());
        long[][] expected = {{1, 1, 8000000}, {2, 3, 6400000}, {4, 5, 5200000}, {6, 8, 4800000}};
        for (int i = 0; i < expected.length; i++) {
            assertEquals(expected[i][0], tiers.get(i).get("minStudents").asLong());
            assertEquals(expected[i][1], tiers.get(i).get("maxStudents").asLong());
            assertEquals(expected[i][2], tiers.get(i).get("pricePerStudent").asLong());
        }
    }

    @Test
    void setActiveIsIdempotentAndSummaryCountsBothStates() throws Exception {
        long id = create(valid()).get("id").asLong();
        JsonNode before = summary();
        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(put(BASE + "/" + id + "/active").header("Authorization", admin)
                            .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.data.active").value(false));
        }
        JsonNode after = summary();
        assertEquals(before.get("total").asLong(), after.get("total").asLong());
        assertEquals(before.get("active").asLong() - 1, after.get("active").asLong());
        assertEquals(before.get("inactive").asLong() + 1, after.get("inactive").asLong());
        mvc.perform(put(BASE + "/" + id + "/active").header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
    }

    @Test
    void listMatchesNameKeywordCaseInsensitivelyAndTreatsWildcardsLiterally() throws Exception {
        var wanted = valid();
        wanted.put("name", "Hoa hoc 12 - On thi 100%_dat");
        create(wanted);
        var other = valid();
        other.put("name", "Toan 10 - Nen tang");
        create(other);
        JsonNode found = list("ON THI 100%_");
        assertEquals(1, found.get("totalElements").asLong());
        assertEquals("Hoa hoc 12 - On thi 100%_dat", found.get("content").get(0).get("name").asText());
        assertEquals(0, list("toan 1_").get("totalElements").asLong());
    }

    private JsonNode summary() throws Exception {
        String body = mvc.perform(get(BASE + "/summary").header("Authorization", admin))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("data");
    }

    private JsonNode list(String keyword) throws Exception {
        String body = mvc.perform(get(BASE).header("Authorization", admin).param("q", keyword))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("data");
    }

    @Test
    void openApiOnlyAdvertisesHighSchoolGrades() throws Exception {
        String body = mvc.perform(get("/api-docs")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode grades = json.readTree(body).path("components").path("schemas")
                .path("CourseRequest").path("properties").path("gradeLevel").path("enum");
        assertEquals(json.valueToTree(java.util.List.of("GRADE_10", "GRADE_11", "GRADE_12")), grades);
    }

    private JsonNode create(Map<String, Object> body) throws Exception {
        String response = mvc.perform(post(BASE).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("data");
    }

    private String bearer(String role) {
        User user = users.saveAndFlush(User.builder().email(role.toLowerCase() + "@course-test.local")
                .password("unused-in-jwt-tests").fullName(role).role("ROLE_" + role).enabled(true).build());
        return "Bearer " + jwt.generateToken(Map.of("role", user.getRole()), user);
    }

    private static Map<String, Object> valid() {
        var body = new LinkedHashMap<String, Object>();
        body.put("name", "Toan lop 10"); body.put("subject", "MATH"); body.put("gradeLevel", "GRADE_10");
        body.put("basePrice1on1", 8000000); body.put("totalSessions", 36); body.put("durationMinutes", 120);
        body.put("description", "Course description");
        return body;
    }
}