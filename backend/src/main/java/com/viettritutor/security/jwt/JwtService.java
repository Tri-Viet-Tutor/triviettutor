package com.viettritutor.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import com.viettritutor.entity.User;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * JWT utility service.
 *
 * Handles token generation, validation, and claims extraction.
 * The signing secret is read from app.jwt.secret in application properties.
 */
@Service
public class JwtService {

    static final String USER_ID_CLAIM = "userId";

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    // ── Token Generation ──────────────────────────────────────────────────────

    /**
     * Generate a JWT for the given user with additional custom claims.
     *
     * @param extraClaims additional claims to embed (e.g., role, userId)
     * @param userDetails Spring Security user details
     * @return signed JWT string
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>(extraClaims);
        if (userDetails instanceof User user && user.getId() != null) {
            claims.put(USER_ID_CLAIM, user.getId());
        }
        return Jwts.builder()
                .claims(claims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    // ── Token Validation ──────────────────────────────────────────────────────

    /**
     * Returns true if the token is valid and not expired for the given user.
     * The subject is an email, which an admin can change and a new account can then take over,
     * so the token must also carry the id of the account it was issued for.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername())
                && issuedForSameAccount(token, userDetails)
                && !isTokenExpired(token);
    }

    private boolean issuedForSameAccount(String token, UserDetails userDetails) {
        if (!(userDetails instanceof User user)) {
            return true;
        }
        Object userId = extractClaim(token, claims -> claims.get(USER_ID_CLAIM));
        if (userId == null) {
            // Every token this service issues for an account carries the id; nothing to compare otherwise.
            return true;
        }
        return userId instanceof Number id && user.getId() != null && id.longValue() == user.getId();
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // ── Claims Extraction ─────────────────────────────────────────────────────

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
