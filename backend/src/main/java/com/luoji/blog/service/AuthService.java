package com.luoji.blog.service;

import com.luoji.blog.dto.ChangePasswordRequest;
import com.luoji.blog.dto.LoginRequest;
import com.luoji.blog.vo.LoginResponse;
import com.luoji.blog.vo.UserVO;

import java.util.Date;

/** 认证服务 */
public interface AuthService {

    /** 账号密码登录，成功签发双 token */
    LoginResponse login(LoginRequest request, String ip, String userAgent);

    /** 用刷新令牌换取新的双 token */
    LoginResponse refresh(String refreshToken);

    /** 登出：把当前 access token 的 jti 加入黑名单 */
    void logout(String jti, Date expiresAt);

    /** 当前登录用户信息 */
    UserVO currentUser();

    /** 修改密码（校验旧密码，成功后吊销该用户全部 token） */
    void changePassword(Long userId, ChangePasswordRequest request);
}
