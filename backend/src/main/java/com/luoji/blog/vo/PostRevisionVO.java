package com.luoji.blog.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 文章历史版本出参 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostRevisionVO {

    private Integer version;

    private String title;

    private String summary;

    private String content;

    private LocalDateTime createdAt;
}
