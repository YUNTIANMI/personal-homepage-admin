package com.luoji.blog.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 媒体出参 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaVO {

    private Long id;

    private String filename;

    private String path;

    private String url;

    private Long size;

    private String mime;

    private LocalDateTime createdAt;
}
