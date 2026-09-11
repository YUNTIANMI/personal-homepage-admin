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
 * 不暴露 {@code deleted} / {@code version} / {@code authorId} 等内部字段。
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

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
