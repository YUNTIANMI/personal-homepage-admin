package com.luoji.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * 文章状态流转入参。
 *
 * <p>{@code version} 用于乐观锁：并发流转时后提交者会因版本不匹配返回 409。
 */
@Getter
@Setter
public class PostStatusDTO {

    @NotBlank(message = "状态不能为空")
    private String status;

    @NotNull(message = "版本号不能为空")
    private Integer version;
}
