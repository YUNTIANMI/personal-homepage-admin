package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

/** 标签 */
@Getter
@Setter
@TableName("tag")
public class Tag extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;
}
