package com.luoji.blog.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * 文章置顶 / 排序权重入参。
 *
 * <p>{@code isTop}：1 置顶 / 0 取消；{@code sort}：同组内权重，越大越靠前。
 */
@Getter
@Setter
public class PostTopDTO {

    private Integer isTop;

    private Integer sort;
}
