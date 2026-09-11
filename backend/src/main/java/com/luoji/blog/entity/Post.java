package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 文章。
 *
 * <p>{@code status}（草稿 / 已发布 / 已归档）配合 {@link com.luoji.blog.common.enums.PostStatus}
 * 状态机做合法流转校验；{@code version} 标注 {@link Version} 后由 MyBatis-Plus 乐观锁插件
 * 自动在更新语句追加 {@code AND version = ?}，并发编辑冲突时影响行数为 0 → 返回 409。
 */
@Getter
@Setter
@TableName("post")
public class Post extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;

    /** 展示日期（对应前端 date 字段，格式 yyyy-MM-dd） */
    private LocalDate postDate;

    private String category;

    private String summary;

    /** Markdown 正文 */
    private String content;

    /** DRAFT / PUBLISHED / ARCHIVED */
    private String status;

    private Integer isTop;

    private Integer sort;

    private Integer viewCount;

    /** 乐观锁版本号（@Version 由 MyBatis-Plus 插件自动生效） */
    @Version
    private Integer version;

    private LocalDateTime publishedAt;

    private Long authorId;
}
