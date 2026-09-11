package com.luoji.blog.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/** 站点配置保存入参 */
@Getter
@Setter
public class SiteConfigSaveDTO {

    @NotBlank(message = "姓名不能为空")
    @Size(max = 50)
    private String name;

    @NotBlank(message = "英文标识不能为空")
    @Size(max = 50)
    private String en;

    @NotBlank(message = "定位不能为空")
    @Size(max = 80)
    private String role;

    @NotBlank(message = "一句话简介不能为空")
    @Size(max = 120)
    private String headline;

    @NotBlank(message = "个人简介不能为空")
    @Size(max = 500)
    private String intro;

    private String github;

    @Email(message = "邮箱格式不正确")
    private String email;

    private List<String> tech;

    private Integer startYear;
}
