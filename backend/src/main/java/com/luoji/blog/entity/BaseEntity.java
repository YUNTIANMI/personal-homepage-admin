package com.luoji.blog.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableLogic;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 实体公共父类：时间戳 + 逻辑删除。
 *
 * <p>所有业务表都带这三列，放在父类里统一处理，避免每张表重复声明。
 * 值由 {@code MyMetaObjectHandler} 自动填充，业务代码不手写。
 */
@Getter
@Setter
public abstract class BaseEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 创建时间（插入时自动填充） */
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /** 更新时间（插入与更新时自动填充） */
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 逻辑删除标记：0 正常 / 1 已删除。
     * 标注 {@code @TableLogic} 后，查询由 MyBatis-Plus 自动追加 {@code deleted = 0}，
     * 删除操作自动改写为 {@code UPDATE ... SET deleted = 1} —— 业务代码不需要关心。
     */
    @TableLogic
    @TableField(value = "deleted", fill = FieldFill.INSERT)
    private Integer deleted;
}
