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
        // updatedAt 是审计字段，每次更新都应刷新为当前时间。
        // 用 setFieldValByName 而非 strictUpdateFill：updateById 前通常先 selectById 查回实体，
        // 此时 updatedAt 已有旧值，strict 语义会跳过填充，导致「按更新时间排序」失效，
        // 且显式 SET 旧值还会覆盖 MySQL 的 ON UPDATE CURRENT_TIMESTAMP。
        setFieldValByName("updatedAt", LocalDateTime.now(), metaObject);
    }
}
