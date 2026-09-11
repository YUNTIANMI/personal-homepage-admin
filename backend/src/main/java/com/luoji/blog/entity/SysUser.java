package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 账号（管理员 / 编辑）。
 *
 * <p>密码字段存 BCrypt 哈希，绝不落明文；登录失败计数与锁定也在此表，
 * 因此「登录风控」不依赖外部组件（Redis 仅用于 token 黑名单）。
 */
@Getter
@Setter
@TableName("sys_user")
public class SysUser extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String username;

    /** BCrypt 哈希 */
    private String password;

    private String nickname;

    private String email;

    /** 1 启用 / 0 禁用 */
    private Integer status;

    /** 连续登录失败次数 */
    private Integer failCount;

    /** 锁定截止时间；null 表示未锁定 */
    private LocalDateTime lockedUntil;

    /** 令牌版本号：自增即吊销该用户全部已签发的 token */
    private Integer tokenVersion;
}
