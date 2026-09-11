package com.luoji.blog.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * JWT 签发与校验。
 *
 * <p>两种令牌：
 * <ul>
 *   <li><b>access</b>（短效，默认 30 分钟）：携带 {@code sub}（用户 id）、{@code username}、
 *       {@code roles}、{@code tv}（令牌版本号，改密后自增使旧 token 失效）、{@code jti}；</li>
 *   <li><b>refresh</b>（长效，默认 7 天）：只携带 {@code sub} 与 {@code type=refresh}，
 *       用于静默换取新 access，不能当作访问令牌。</li>
 * </ul>
 */
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long accessExpireMs;
    private final long refreshExpireMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-expire-minutes:30}") long accessExpireMinutes,
            @Value("${jwt.refresh-expire-days:7}") long refreshExpireDays) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpireMs = accessExpireMinutes * 60_000L;
        this.refreshExpireMs = refreshExpireDays * 24L * 3600_000L;
    }

    /** 签发访问令牌 */
    public String createAccessToken(Long userId, String username, List<String> roles, int tokenVersion) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("username", username)
                .claim("roles", roles)
                .claim("tv", tokenVersion)
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessExpireMs))
                .signWith(key)
                .compact();
    }

    /** 签发刷新令牌 */
    public String createRefreshToken(Long userId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("type", "refresh")
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + refreshExpireMs))
                .signWith(key)
                .compact();
    }

    /**
     * 解析并校验签名与有效期。
     *
     * @throws io.jsonwebtoken.JwtException 签名不合法或已过期
     */
    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    /** access 有效期（秒），用于返回给前端 */
    public long getAccessExpireSeconds() {
        return accessExpireMs / 1000;
    }
}
