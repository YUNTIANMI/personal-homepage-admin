package com.luoji.blog.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.luoji.blog.common.ErrorCode;
import com.luoji.blog.common.Result;
import com.luoji.blog.entity.SysUser;
import com.luoji.blog.mapper.SysUserMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT 鉴权过滤器：每个请求执行一次。
 *
 * <p>校验链路：解析签名与过期 → 拒绝 refresh 令牌 → 查 Redis 黑名单 →
 * 账号是否存在且启用 → 令牌版本号是否已升级（改密后旧 token 失效）。
 * 全部通过后才把用户放进 SecurityContext，后续 {@code @PreAuthorize} 才能生效。
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider tokenProvider;
    private final TokenBlacklistService blacklistService;
    private final SysUserMapper userMapper;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = resolveToken(request);
        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = tokenProvider.parse(token);

            // 刷新令牌不能当作访问令牌
            if ("refresh".equals(claims.get("type"))) {
                throw new IllegalArgumentException("refresh token not allowed");
            }
            // 登出后进了黑名单
            if (blacklistService.contains(claims.getId())) {
                throw new IllegalArgumentException("token blacklisted");
            }

            Long userId = Long.valueOf(claims.getSubject());
            SysUser user = userMapper.selectById(userId);
            if (user == null || user.getStatus() == null || user.getStatus() != 1) {
                throw new IllegalArgumentException("user disabled");
            }
            Integer tokenVersion = claims.get("tv", Integer.class);
            if (tokenVersion == null || !tokenVersion.equals(user.getTokenVersion())) {
                throw new IllegalArgumentException("token revoked");
            }

            List<?> rawRoles = claims.get("roles", List.class);
            List<String> roles = rawRoles.stream().map(String::valueOf).toList();
            LoginUser loginUser = new LoginUser(
                    userId,
                    claims.get("username", String.class),
                    roles,
                    claims.getId(),
                    claims.getExpiration());
            var authorities = loginUser.roles().stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .toList();
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(loginUser, null, authorities));
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            writeUnauthorized(response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(Result.fail(ErrorCode.UNAUTHORIZED)));
    }
}
