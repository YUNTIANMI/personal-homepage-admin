package com.luoji.blog.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 操作审计日志出参 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperationLogVO {

    private Long id;

    private String username;

    private String module;

    private String action;

    private Long targetId;

    private String ip;

    private Integer durationMs;

    /** 1 成功 / 0 失败 */
    private Integer success;

    private LocalDateTime createdAt;
}
