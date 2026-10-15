package com.viettritutor;
import org.springframework.boot.*;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import com.viettritutor.service.*;
import java.net.InetAddress;
import java.util.*;
import static org.mockito.Mockito.mock;

/** Manual Swagger server with isolated fixtures; all connection settings come from environment. */
public class PayrollTestServer {
    public static void main(String[] args)throws Exception{
        String address=required("PAYROLL_TEST_BIND_ADDRESS"),url=required("PAYROLL_TEST_JDBC_URL");
        if(!InetAddress.getByName(address).isLoopbackAddress() || !url.startsWith("jdbc:h2:mem:"))
            throw new IllegalArgumentException("Payroll fixtures require loopback and an in-memory H2 database");
        new SpringApplication(VietTriTutorApplication.class,Fixtures.class).run(
                "--spring.profiles.active=payroll-test","--server.address="+address,"--server.port="+required("PAYROLL_TEST_PORT"),
                "--spring.datasource.url="+url,"--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.datasource.username="+required("PAYROLL_TEST_DB_USER"),"--spring.datasource.password=",
                "--spring.jpa.hibernate.ddl-auto=create-drop","--spring.flyway.enabled=false","--spring.jpa.show-sql=false",
                "--spring.mail.username="+required("PAYROLL_TEST_MAIL_USER"),"--spring.mail.password="+UUID.randomUUID(),
                "--app.jwt.secret="+UUID.randomUUID()+UUID.randomUUID(),"--logging.level.root=INFO",
                "--payroll.test.password="+required("PAYROLL_TEST_PASSWORD"),
                "--payroll.test.email-domain="+required("PAYROLL_TEST_EMAIL_DOMAIN"),
                "--app.cors.allowed-origins="+required("PAYROLL_TEST_ORIGIN"),"--app.frontend-url="+required("PAYROLL_TEST_ORIGIN"),
                "--spring.main.allow-bean-definition-overriding=true");
    }
    private static String required(String key){
        String value=System.getenv(key);
        if(value==null || value.isBlank())throw new IllegalArgumentException("Set "+key);
        return value;
    }
    @TestConfiguration(proxyBeanMethods=false) @Import(PayrollTestFixtures.class)
    static class Fixtures {
        @Bean SessionLifecycleJob sessionLifecycleJob(){return mock(SessionLifecycleJob.class);}
        @Bean AttendanceLockJob attendanceLockJob(){return mock(AttendanceLockJob.class);}
        @Bean ApplicationRunner payrollFixtures(PayrollTestFixtures fixtures){
            return args -> {var data=fixtures.seed();System.out.println("Payroll Swagger fixtures ready; period="+data.month());};
        }
    }
}
