package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 操作审计日志。
 *
 * <p>由 {@code @OperationLog} + AOP 自动写入，记录「谁、何时、对什么、做了什么、结果如何」。
 * 该表只增不删、不参与逻辑删除，因此不继承 {@link BaseEntity}。
 */
@Getter
@Setter
@TableName("operation_log")
public class OperationLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String username;

    /** 业务模块：POST / PROJECT / MEDIA / CONFIG / ACCOUNT */
    private String module;

    /** 动作：CREATE / UPDATE / DELETE / PUBLISH / ARCHIVE / ROLLBACK / RESTORE ... */
    private String action;

    private Long targetId;

    /** 变更摘要（JSON 字符串） */
    private String detail;

    private String ip;

    private Integer durationMs;

    /** 1 成功 / 0 失败 */
    private Integer success;

    private LocalDateTime createdAt;
}
