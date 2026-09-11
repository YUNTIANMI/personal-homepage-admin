package com.luoji.blog.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * JWT 签发与校验的单元测试（不依赖 Spring 容器与数据库）。
 */
class JwtTokenProviderTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef0123456789";

    @Test
    @DisplayName("访问令牌：签发后能解析回原始信息")
    void accessTokenRoundTrip() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, 30, 7);

        String token = provider.createAccessToken(1L, "admin", List.of("ADMIN"), 0);
        Claims claims = provider.parse(token);

        assertThat(claims.getSubject()).isEqualTo("1");
        assertThat(claims.get("username", String.class)).isEqualTo("admin");
        assertThat(roles(claims)).containsExactly("ADMIN");
        assertThat(claims.get("tv", Integer.class)).isZero();
        assertThat(claims.get("type")).isNull();
    }

    @SuppressWarnings("unchecked")
    private static List<String> roles(Claims claims) {
        return (List<String>) claims.get("roles", List.class);
    }

    @Test
    @DisplayName("刷新令牌：带 type=refresh 标记，与访问令牌区分")
    void refreshTokenHasType() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, 30, 7);

        String refresh = provider.createRefreshToken(1L);
        Claims claims = provider.parse(refresh);

        assertThat(claims.getSubject()).isEqualTo("1");
        assertThat(claims.get("type", String.class)).isEqualTo("refresh");
    }

    @Test
    @DisplayName("access 有效期（秒）与构造参数一致")
    void accessExpireSecondsMatchesMinutes() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, 30, 7);
        assertThat(provider.getAccessExpireSeconds()).isEqualTo(1800);
    }
}
