package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 站点配置（单行，id 恒为 1）。
 *
 * <p>不继承 BaseEntity：它是配置而非内容数据，没有逻辑删除，只有更新时间。
 */
@Getter
@Setter
@TableName("site_config")
public class SiteConfig {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String en;

    private String role;

    private String headline;

    private String intro;

    private String github;

    private String email;

    /** JSON 字符串：string[] */
    private String tech;

    @TableField("start_year")
    private Integer startYear;

    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
