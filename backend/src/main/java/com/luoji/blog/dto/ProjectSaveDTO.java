package com.luoji.blog.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/** 项目新建 / 编辑入参 */
@Getter
@Setter
public class ProjectSaveDTO {

    @NotBlank(message = "项目名称不能为空")
    @Size(max = 80, message = "项目名称不能超过 80 字")
    private String name;

    @Size(max = 200, message = "一句话简介不能超过 200 字")
    private String tagline;

    private List<String> tech;

    /** 至少 1 条有效外链；地址必须为 http(s) 绝对地址（在 Service 中做完整校验） */
    @NotEmpty(message = "至少需要 1 条外链")
    @Valid
    private List<ProjectLink> links;
}
