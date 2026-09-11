package com.luoji.blog.common.enums;

/**
 * 操作审计日志的业务模块。
 *
 * <p>配合 {@code @OperationLog} 注解使用，把「谁在哪个模块做了什么」的取值收敛到枚举，
 * 避免 Controller 里散落魔法字符串。
 */
public enum LogModule {
    POST("文章"),
    PROJECT("项目"),
    MEDIA("媒体"),
    CONFIG("站点配置"),
    ACCOUNT("账号");

    private final String label;

    LogModule(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
