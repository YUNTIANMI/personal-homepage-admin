package com.luoji.blog.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 登录成功响应 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String accessToken;

    private String refreshToken;

    /** access token 有效期（秒） */
    @Schema(example = "1800")
    private long expiresIn;

    private UserVO user;
}
