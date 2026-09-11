package com.luoji.blog.security;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Token 黑名单（Redis）。
 *
 * <p>背景：JWT 是无状态的，服务端签出去后无法「收回」。要支持「登出后立即失效」，
 * 只能把被登出的 token 的 {@code jti} 记进一个共享存储，每次请求校验时查一下。
 * 用 Redis 是因为它天然支持过期时间（TTL），黑名单条目到期自动清理。
 */
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private static final String PREFIX = "auth:blacklist:";

    private final StringRedisTemplate redisTemplate;

    /** 把 token 的 jti 加入黑名单，TTL 为其剩余有效期 */
    public void add(String jti, long ttlSeconds) {
        if (jti == null || ttlSeconds <= 0) {
            return;
        }
        redisTemplate.opsForValue().set(PREFIX + jti, "1", Duration.ofSeconds(ttlSeconds));
    }

    public boolean contains(String jti) {
        if (jti == null) {
            return false;
        }
        return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + jti));
    }
}
