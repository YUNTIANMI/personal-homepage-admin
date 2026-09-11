package com.luoji.blog.security;

import java.util.Date;
import java.util.List;

/**
 * 当前登录用户（从 JWT 解析后放进 SecurityContext 的 principal）。
 *
 * @param id        用户主键
 * @param username  用户名
 * @param roles     角色编码集合（不含 ROLE_ 前缀）
 * @param jti       本次 token 的唯一标识（登出时进黑名单）
 * @param expiresAt token 过期时间（登出时计算黑名单 TTL）
 */
public record LoginUser(Long id, String username, List<String> roles, String jti, Date expiresAt) {
}
