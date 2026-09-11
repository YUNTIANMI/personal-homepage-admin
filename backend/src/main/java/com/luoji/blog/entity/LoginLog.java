package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 登录日志（成功与失败都记录）。
 *
 * <p>与其它业务表不同：登录日志**不做逻辑删除**（不是可恢复的内容数据），
 * 也不继承 {@link BaseEntity}，只有创建时间。
 */
@Getter
@Setter
@TableName("login_log")
public class LoginLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String username;

    private String ip;

    @TableField("user_agent")
    private String userAgent;

    /** 1 成功 / 0 失败 */
    private Integer success;

    private String message;

    /** 由数据库默认值 CURRENT_TIMESTAMP 填充 */
    @TableField("created_at")
    private LocalDateTime createdAt;
}
