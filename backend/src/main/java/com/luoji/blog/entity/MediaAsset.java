package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

/** 媒体文件 */
@Getter
@Setter
@TableName("media_asset")
public class MediaAsset extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String filename;

    /** 相对路径 yyyy/MM/uuid.ext */
    private String path;

    /** 对外可访问地址 */
    private String url;

    private Long size;

    private String mime;

    private Long uploaderId;
}
