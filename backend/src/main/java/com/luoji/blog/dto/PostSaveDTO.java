package com.luoji.blog.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/** 文章新建 / 编辑入参 */
@Getter
@Setter
public class PostSaveDTO {

    @NotBlank(message = "标题不能为空")
    @Size(max = 100, message = "标题不能超过 100 字")
    private String title;

    @NotNull(message = "日期不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    @Size(max = 50, message = "分类不能超过 50 字")
    private String category;

    private List<String> tags;

    @Size(max = 300, message = "摘要不能超过 300 字")
    private String summary;

    @NotBlank(message = "正文不能为空")
    @Size(min = 6, message = "正文至少 6 个字符")
    private String content;

    /** 乐观锁版本号：编辑时必填（新增时后端置 0） */
    private Integer version;
}
