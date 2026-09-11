package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 文章历史版本快照。
 *
 * <p>只在「发布」时留存一版（标题 / 摘要 / 正文 + 发布时的版本号），用于查看与回滚。
 * 该表不参与逻辑删除（没有 deleted 列），版本号由乐观锁的 version 决定，
 * 因此不继承 {@link BaseEntity}。
 */
@Getter
@Setter
@TableName("post_revision")
public class PostRevision {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long postId;

    /** 对应发布时的文章版本号 */
    private Integer version;

    private String title;

    private String summary;

    private String content;

    private Long editorId;

    private LocalDateTime createdAt;
}
