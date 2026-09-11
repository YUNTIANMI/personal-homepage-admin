package com.luoji.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.luoji.blog.common.BizException;
import com.luoji.blog.common.ErrorCode;
import com.luoji.blog.dto.ChangePasswordRequest;
import com.luoji.blog.dto.LoginRequest;
import com.luoji.blog.entity.LoginLog;
import com.luoji.blog.entity.SysUser;
import com.luoji.blog.mapper.LoginLogMapper;
import com.luoji.blog.mapper.SysRoleMapper;
import com.luoji.blog.mapper.SysUserMapper;
import com.luoji.blog.security.JwtTokenProvider;
import com.luoji.blog.security.LoginUser;
import com.luoji.blog.security.SecurityUtils;
import com.luoji.blog.security.TokenBlacklistService;
import com.luoji.blog.service.AuthService;
import com.luoji.blog.vo.LoginResponse;
import com.luoji.blog.vo.UserVO;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;

/**
 * 认证服务实现。
 *
 * <p>登录风控（失败计数与锁定）使用 {@code sys_user} 表内的 {@code fail_count} /
 * {@code locked_until} 字段，不依赖外部组件；只有「登出黑名单」用 Redis。
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    /** 连续失败达到该次数即锁定 */
    private static final int MAX_FAIL_COUNT = 5;
    /** 锁定时长（分钟） */
    private static final long LOCK_MINUTES = 15;

    private final SysUserMapper userMapper;
    private final SysRoleMapper roleMapper;
    private final LoginLogMapper loginLogMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final TokenBlacklistService blacklistService;

    @Override
    public LoginResponse login(LoginRequest request, String ip, String userAgent) {
        String username = request.getUsername().trim();
        SysUser user = userMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username));

        // 账号不存在：与密码错误返回同一提示，不泄露账号是否存在
        if (user == null) {
            recordLogin(username, ip, userAgent, false, "用户名或密码错误");
            throw new BizException(ErrorCode.BAD_CREDENTIALS);
        }
        if (user.getStatus() == null || user.getStatus() != 1) {
            recordLogin(username, ip, userAgent, false, "账号已禁用");
            throw new BizException(ErrorCode.FORBIDDEN, "账号已禁用");
        }
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            recordLogin(username, ip, userAgent, false, "账号已锁定");
            throw new BizException(ErrorCode.ACCOUNT_LOCKED);
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            int newFailCount = (user.getFailCount() == null ? 0 : user.getFailCount()) + 1;
            // 原子自增；达到阈值时写锁定时间。
            // 注意：本次仍返回「密码错误」，下一次请求才会命中顶部的锁定校验返回 423。
            userMapper.update(null, new LambdaUpdateWrapper<SysUser>()
                    .setSql("fail_count = fail_count + 1")
                    .set(newFailCount >= MAX_FAIL_COUNT, SysUser::getLockedUntil,
                            LocalDateTime.now().plusMinutes(LOCK_MINUTES))
                    .eq(SysUser::getId, user.getId()));
            recordLogin(username, ip, userAgent, false,
                    newFailCount >= MAX_FAIL_COUNT ? "登录失败次数过多，账号已锁定" : "用户名或密码错误");
            throw new BizException(ErrorCode.BAD_CREDENTIALS);
        }

        // 登录成功：重置失败计数与锁定状态
        userMapper.update(null, new LambdaUpdateWrapper<SysUser>()
                .set(SysUser::getFailCount, 0)
                .set(SysUser::getLockedUntil, null)
                .eq(SysUser::getId, user.getId()));
        recordLogin(username, ip, userAgent, true, "登录成功");

        List<String> roles = roleMapper.selectCodesByUserId(user.getId());
        return buildLoginResponse(user, roles);
    }

    @Override
    public LoginResponse refresh(String refreshToken) {
        Claims claims;
        try {
            claims = tokenProvider.parse(refreshToken);
        } catch (Exception e) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "登录已过期，请重新登录");
        }
        if (!"refresh".equals(claims.get("type"))) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "非法的刷新令牌");
        }

        Long userId = Long.valueOf(claims.getSubject());
        SysUser user = userMapper.selectById(userId);
        if (user == null || user.getStatus() == null || user.getStatus() != 1) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
        List<String> roles = roleMapper.selectCodesByUserId(userId);
        return buildLoginResponse(user, roles);
    }

    @Override
    public void logout(String jti, Date expiresAt) {
        long remainingSeconds = expiresAt == null
                ? 0
                : (expiresAt.getTime() - System.currentTimeMillis()) / 1000;
        blacklistService.add(jti, remainingSeconds);
    }

    @Override
    public UserVO currentUser() {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = userMapper.selectById(loginUser.id());
        if (user == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
        return toUserVO(user, loginUser.roles());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changePassword(Long userId, ChangePasswordRequest request) {
        SysUser user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new BizException(ErrorCode.BAD_CREDENTIALS, "当前密码不正确");
        }
        // 更新密码 + 令牌版本自增：该用户此前签发的所有 token 立即失效
        userMapper.update(null, new LambdaUpdateWrapper<SysUser>()
                .set(SysUser::getPassword, passwordEncoder.encode(request.getNewPassword()))
                .setSql("token_version = token_version + 1")
                .eq(SysUser::getId, userId));
    }

    private LoginResponse buildLoginResponse(SysUser user, List<String> roles) {
        int tokenVersion = user.getTokenVersion() == null ? 0 : user.getTokenVersion();
        String access = tokenProvider.createAccessToken(user.getId(), user.getUsername(), roles, tokenVersion);
        String refresh = tokenProvider.createRefreshToken(user.getId());
        return LoginResponse.builder()
                .accessToken(access)
                .refreshToken(refresh)
                .expiresIn(tokenProvider.getAccessExpireSeconds())
                .user(toUserVO(user, roles))
                .build();
    }

    private UserVO toUserVO(SysUser user, List<String> roles) {
        return UserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .roles(roles)
                .build();
    }

    private void recordLogin(String username, String ip, String userAgent, boolean success, String message) {
        LoginLog log = new LoginLog();
        log.setUsername(username);
        log.setIp(ip == null ? "" : ip);
        log.setUserAgent(userAgent == null ? "" : userAgent);
        log.setSuccess(success ? 1 : 0);
        log.setMessage(message);
        loginLogMapper.insert(log);
    }
}
