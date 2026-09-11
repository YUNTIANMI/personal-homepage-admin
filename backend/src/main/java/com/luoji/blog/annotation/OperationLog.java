package com.luoji.blog.annotation;

import com.luoji.blog.common.enums.LogModule;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 操作审计注解：标注在 Controller 写接口上，由 {@code OperationLogAspect} 自动记录。
 *
 * <p>使用方式（一加即生效，业务代码零侵入）：
 * <pre>
 * {@literal @}OperationLog(module = LogModule.POST, action = "PUBLISH")
 * {@literal @}PutMapping("/{id}/status")
 * public Result{@literal <}Void{@literal >} changeStatus(...) { ... }
 * </pre>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface OperationLog {

    /** 业务模块 */
    LogModule module();

    /** 动作（CREATE / UPDATE / DELETE / PUBLISH / ARCHIVE / ROLLBACK / RESTORE ...） */
    String action();
}
