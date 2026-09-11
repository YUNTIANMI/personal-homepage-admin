package com.luoji.blog.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** 刷新令牌入参 */
@Getter
@Setter
public class RefreshRequest {

    @NotBlank(message = "refreshToken 不能为空")
    private String refreshToken;
}
