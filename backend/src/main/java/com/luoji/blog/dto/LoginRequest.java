package com.luoji.blog.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** 登录入参 */
@Getter
@Setter
public class LoginRequest {

    @NotBlank(message = "用户名不能为空")
    @Schema(example = "admin")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Schema(example = "admin123")
    private String password;
}
