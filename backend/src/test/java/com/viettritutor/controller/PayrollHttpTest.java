package com.viettritutor.controller;
import com.fasterxml.jackson.databind.*;
import com.viettritutor.PayrollTestFixtures;
import com.viettritutor.repository.PayrollPeriodRepository;
import com.viettritutor.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;
import org.springframework.test.context.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
 "spring.jpa.hibernate.ddl-auto=create-drop","spring.flyway.enabled=false","spring.datasource.driver-class-name=org.h2.Driver",
 "spring.jpa.show-sql=false","logging.level.root=WARN"})
@ActiveProfiles("test") @Import(PayrollTestFixtures.class)
class PayrollHttpTest {
    static final String PASSWORD=UUID.randomUUID().toString(),SECRET=UUID.randomUUID().toString()+UUID.randomUUID();
    static final String DOMAIN="payroll-http.invalid";
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){
        r.add("spring.datasource.url",()->"jdbc:h2:mem:payroll-http-tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        r.add("spring.datasource.username",()->"sa");r.add("spring.datasource.password",()->"");
        
        r.add("app.jwt.secret",()->SECRET);r.add("payroll.test.password",()->PASSWORD);
        r.add("payroll.test.email-domain",()->DOMAIN);r.add("spring.mail.username",()->"unused");r.add("spring.mail.password",()->"unused");
    }
    @MockBean SessionLifecycleJob lifecycleJob;
    @MockBean AttendanceLockJob attendanceJob;
    @Autowired TestRestTemplate http;
    @Autowired ObjectMapper json;
    @Autowired PayrollTestFixtures fixtures;
    @Autowired PayrollPeriodRepository periods;
    int checked=0;
    Map<String,String> tokens=new HashMap<>();
    JsonNode call(String method,String path,Object body,String role,String key,int expected)throws Exception{
        var headers=new HttpHeaders();headers.setContentType(MediaType.APPLICATION_JSON);
        if(role!=null)headers.setBearerAuth(role.equals("invalid")?"invalid":tokens.get(role));
        if(key!=null)headers.set("Idempotency-Key",key);
        var response=http.exchange(path,HttpMethod.valueOf(method),new HttpEntity<>(body,headers),String.class);
        assertEquals(expected,response.getStatusCode().value(),method+" "+path+" "+response.getBody());
        JsonNode result=json.readTree(response.getBody());assertEquals(expected<400,result.path("success").asBoolean());
        checked++;return result.path("data");
    }
    @Test void sequentialRealHttpChecksWithAllRolesAndSwagger()throws Exception{
        http.getRestTemplate().setRequestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory());
        var f=fixtures.seed();
        assertEquals(200,http.getForEntity("/swagger-ui/index.html",String.class).getStatusCode().value());checked++;
        var spec=json.readTree(http.getForObject("/api-docs",String.class));
        assertTrue(spec.path("paths").path("/api/v1/admin/payroll/{year}/{month}/finalize").has("post"));checked++;
        for(String role:List.of("admin","tutor","substitute","student","idle")){
            var login=call("POST","/api/v1/auth/login",Map.of("email",role+"@"+DOMAIN,"password",PASSWORD),null,null,200);
            tokens.put(role,login.path("accessToken").asText());assertFalse(tokens.get(role).isBlank());
        }
        String period="/api/v1/admin/payroll/"+f.month().getYear()+"/"+f.month().getMonthValue();
        for(String role:Arrays.asList(null,"invalid","tutor","student")){
            int status=role==null||role.equals("invalid")?401:403;
            call("GET",period,null,role,null,status);call("POST",period+"/finalize",null,role,"denied-key",status);
        }
        for(String role:Arrays.asList(null,"invalid","admin","student"))
            call("GET","/api/v1/tutor/payroll",null,role,null,role==null||role.equals("invalid")?401:403);
        assertEquals(0,call("GET","/api/v1/tutor/payroll",null,"tutor",null,200).path("totalElements").asInt());
        var preview=call("GET",period,null,"admin",null,200);
        assertEquals("DRAFT",preview.path("status").asText());assertEquals(13850000,preview.path("totalPayroll").asLong());
        assertEquals(0,periods.count());
        for(String bad:List.of("0/1","9999/1","2030/13","2030/0","x/1"))
            call("GET","/api/v1/admin/payroll/"+bad,null,"admin",null,400);
        for(String bad:List.of("month=1","year=0","year=2030&month=13","size=101","size=0","page=-1"))
            call("GET","/api/v1/tutor/payroll?"+bad,null,"tutor",null,400);
        call("POST",period+"/finalize",null,"admin",null,400);
        call("POST",period+"/finalize",null,"admin","bad key",400);
        var future=f.month().plusMonths(1);
        call("POST","/api/v1/admin/payroll/"+future.getYear()+"/"+future.getMonthValue()+"/finalize",null,"admin","future",422);
        var finalized=call("POST",period+"/finalize",null,"admin","http-key",200);
        assertEquals("FINALIZED",finalized.path("status").asText());
        assertEquals(finalized,call("POST",period+"/finalize",null,"admin","http-key",200));
        assertEquals(finalized,call("POST",period+"/finalize",null,"admin","another-key",200));
        assertEquals(finalized,call("GET",period,null,"admin",null,200));
        for(String role:List.of("tutor","substitute","idle")){
            var mine=call("GET","/api/v1/tutor/payroll?year="+f.month().getYear()+"&month="+f.month().getMonthValue(),null,role,null,200);
            assertEquals(1,mine.path("totalElements").asInt());assertEquals(1,mine.path("content").size());
            assertFalse(mine.toString().contains("totalPayroll"));
        }
        var own=call("GET","/api/v1/tutor/payroll?tutorId="+f.substitute().getId(),null,"tutor",null,200);
        assertEquals(f.tutor().getId().longValue(),own.path("content").get(0).path("tutorId").asLong());
        assertEquals(1600000,own.path("content").get(0).path("sessionPay").asLong());
        assertEquals(2,own.path("content").get(0).path("cancelledSessions").asInt());
        call("PATCH","/api/v1/admin/sessions/"+f.completed().getFirst()+"/attendance/lock",
                Map.of("locked",false,"reason","test"),"admin",null,422);
        var earlier=f.month().minusMonths(1);
        call("POST","/api/v1/admin/payroll/"+earlier.getYear()+"/"+earlier.getMonthValue()+"/finalize",null,"admin","http-key",409);
        assertEquals(0,call("GET","/api/v1/tutor/payroll?page=100",null,"tutor",null,200).path("content").size());
        System.out.println("Payroll HTTP/Swagger checks passed: "+checked);
    }
}
