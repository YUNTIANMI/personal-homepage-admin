package com.luoji.blog.config;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 公共字段自动填充。
 *
 * <p>配合 {@code BaseEntity} 上的 {@code @TableField(fill = ...)} 使用：
 * 业务代码不需要手写 {@code setCreatedAt(...)} / {@code setUpdatedAt(...)}，
 * 也不会出现「某处忘了更新时间」导致数据不一致。
 *
 * <p>使用 {@code strictXxxFill}：只在字段为 null 时填充，不覆盖业务显式设置的值。
 */
@Component
public class MyMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        strictInsertFill(metaObject, "createdAt", LocalDateTime.class, now);
        strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, now);
        strictInsertFill(metaObject, "deleted", Integer.class, 0);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        strictUpdateFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }
}
