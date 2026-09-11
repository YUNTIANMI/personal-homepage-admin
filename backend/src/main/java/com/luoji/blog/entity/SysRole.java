package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

/**
 * 角色字典。
 *
 * <p>当前只有两级：{@code ADMIN}（全部权限）/ {@code EDITOR}（仅内容管理）。
 * 用独立的角色表 + 关联表，而不是在用户表加一个 {@code role} 字段，
 * 是为了演示标准的 RBAC 建模方式，后续扩展角色时无需改表结构。
 */
@Getter
@Setter
@TableName("sys_role")
public class SysRole {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 角色编码：ADMIN / EDITOR */
    private String code;

    private String name;
}
