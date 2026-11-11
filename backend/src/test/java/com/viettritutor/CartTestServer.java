package com.viettritutor;
import com.viettritutor.scheduler.SessionLifecycleJob;
import com.viettritutor.scheduler.AttendanceLockJob;
import org.springframework.boot.*;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import com.viettritutor.service.*;
import java.net.InetAddress;
import java.util.*;
import static org.mockito.Mockito.mock;

/** Manual Swagger server with isolated fixtures; all connection settings come from environment. */
public class CartTestServer {
    public static void main(String[] args)throws Exception{
        String address=required("CART_TEST_BIND_ADDRESS"),url=required("CART_TEST_JDBC_URL");
        if(!InetAddress.getByName(address).isLoopbackAddress() || !url.startsWith("jdbc:h2:mem:"))
            throw new IllegalArgumentException("Cart fixtures require loopback and an in-memory H2 database");
        new SpringApplication(VietTriTutorApplication.class,Fixtures.class).run(
                "--spring.profiles.active=test","--server.address="+address,"--server.port="+required("CART_TEST_PORT"),
                "--spring.datasource.url="+url,"--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.datasource.username="+required("CART_TEST_DB_USER"),"--spring.datasource.password=",
                "--app.payments.mock-enabled=true","--app.payments.mock-success=true",
                "--spring.jpa.hibernate.ddl-auto=create-drop","--spring.flyway.enabled=false","--spring.jpa.show-sql=false",
                "--spring.mail.username="+required("CART_TEST_MAIL_USER"),"--spring.mail.password="+UUID.randomUUID(),
                "--app.jwt.secret="+UUID.randomUUID()+UUID.randomUUID(),"--logging.level.root=INFO","--logging.level.org.springframework=WARN","--logging.level.org.hibernate=WARN",
                "--cart.test.password="+required("CART_TEST_PASSWORD"),
                "--cart.test.email-domain="+required("CART_TEST_EMAIL_DOMAIN"),
                "--app.cors.allowed-origins="+required("CART_TEST_ORIGIN"),"--app.frontend-url="+required("CART_TEST_ORIGIN"),
                "--spring.main.allow-bean-definition-overriding=true");
    }
    private static String required(String key){
        String value=System.getenv(key);
        if(value==null || value.isBlank())throw new IllegalArgumentException("Set "+key);
        return value;
    }
    @TestConfiguration(proxyBeanMethods=false) @Import(CartTestFixtures.class)
    static class Fixtures {
        @Bean SessionLifecycleJob sessionLifecycleJob(){return mock(SessionLifecycleJob.class);}
        @Bean AttendanceLockJob attendanceLockJob(){return mock(AttendanceLockJob.class);}
        @Bean ApplicationRunner cartFixtures(CartTestFixtures fixtures){
            return args -> {var data=fixtures.seed("swagger");System.out.println("Cart Swagger fixtures ready; students="+data.student().getEmail()+", "+data.other().getEmail()+"; subjects="+data.math().getSubjectId()+", "+data.science().getSubjectId()+"; classes="+data.a().getId()+", "+data.b().getId());};
        }
    }
}
