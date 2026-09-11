package com.luoji.blog.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 文章出参。
 *
 * <p>字段名与前端类型保持一致：{@code date}（yyyy-MM-dd 字符串）、
 * {@code tags}（字符串数组）、{@code description}（对应数据库 summary 列）。
 * 不暴露 {@code deleted} / {@code authorId} 等内部字段；
 * {@code version}（乐观锁）/ {@code isTop} / {@code sort} 需暴露给前端用于编辑与置顶。
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostVO {

    private Long id;

    private String title;

    private String date;

    private String category;

    private List<String> tags;

    private String description;

    private String content;

    private String status;

    /** 乐观锁版本号（编辑 / 状态流转时需原样带回） */
    private Integer version;

    /** 置顶：1 是 / 0 否 */
    private Integer isTop;

    /** 同组内排序权重，越大越靠前 */
    private Integer sort;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
