package com.luoji.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** 修改密码入参 */
@Getter
@Setter
public class ChangePasswordRequest {

    @NotBlank(message = "当前密码不能为空")
    private String oldPassword;

    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, max = 64, message = "新密码长度需在 6~64 位之间")
    private String newPassword;
}
