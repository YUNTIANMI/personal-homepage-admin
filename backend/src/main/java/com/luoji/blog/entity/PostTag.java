package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

/** 文章-标签关联（多对多） */
@Getter
@Setter
@TableName("post_tag")
public class PostTag {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long postId;

    private Long tagId;
}
