package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

/**
 * 软件项目。
 *
 * <p>{@code tech} / {@code links} 在数据库中是 JSON 列，这里以 {@code String} 承载，
 * 由 Service 层用 Jackson 做「JSON 字符串 ↔ 集合对象」的转换（见 {@code ProjectService}）。
 * 这样实体与数据库列一一对应，转换逻辑集中，也便于日后替换存储实现。
 */
@Getter
@Setter
@TableName("project")
public class Project extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String tagline;

    /** JSON 字符串：string[] */
    private String tech;

    /** JSON 字符串：[{id,label,href}] */
    private String links;

    private Integer isTop;

    private Integer sort;

    /** 乐观锁版本号（阶段四启用） */
    private Integer version;
}
