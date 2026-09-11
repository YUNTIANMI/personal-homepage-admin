package com.luoji.blog.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** 项目外链（存于 project.links 的 JSON 数组元素） */
@Getter
@Setter
public class ProjectLink {

    private String id;

    @NotBlank(message = "链接名称不能为空")
    private String label;

    @NotBlank(message = "链接地址不能为空")
    private String href;
}
