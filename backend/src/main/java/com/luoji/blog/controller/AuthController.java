package com.luoji.blog.controller;

import com.luoji.blog.common.Result;
import com.luoji.blog.dto.ChangePasswordRequest;
import com.luoji.blog.dto.LoginRequest;
import com.luoji.blog.dto.RefreshRequest;
import com.luoji.blog.security.LoginUser;
import com.luoji.blog.security.SecurityUtils;
import com.luoji.blog.service.AuthService;
import com.luoji.blog.vo.LoginResponse;
import com.luoji.blog.vo.UserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 认证接口 */
@Tag(name = "01. 认证")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "登录")
    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                       HttpServletRequest http) {
        return Result.ok(authService.login(request, clientIp(http), http.getHeader("User-Agent")));
    }

    @Operation(summary = "刷新令牌")
    @PostMapping("/refresh")
    public Result<LoginResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return Result.ok(authService.refresh(request.getRefreshToken()));
    }

    @Operation(summary = "登出")
    @PostMapping("/logout")
    public Result<Void> logout() {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        authService.logout(loginUser.jti(), loginUser.expiresAt());
        return Result.ok();
    }

    @Operation(summary = "当前登录用户")
    @GetMapping("/me")
    public Result<UserVO> me() {
        return Result.ok(authService.currentUser());
    }

    @Operation(summary = "修改密码")
    @PutMapping("/password")
    public Result<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(SecurityUtils.getUserId(), request);
        return Result.ok();
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
