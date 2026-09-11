package com.luoji.blog.common.enums;

import com.luoji.blog.common.BizException;
import com.luoji.blog.common.ErrorCode;

/**
 * 文章状态与状态机。
 *
 * <p>把「草稿 / 已发布 / 已归档」的合法流转边集中定义在这里（单一事实来源），
 * 避免散落在 Service 里的 if 判断。非法流转统一抛 {@link ErrorCode#STATE_ILLEGAL}。
 *
 * <pre>
 *          publish              archive
 *  草稿 ────────────▶ 已发布 ────────────▶ 已归档
 *                      │   ▲
 *       下架为草稿 ─────┘   │
 *                       恢复为草稿
 * </pre>
 */
public enum PostStatus {

    DRAFT("草稿"),
    PUBLISHED("已发布"),
    ARCHIVED("已归档");

    private final String label;

    PostStatus(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** 从字符串解析；未知值抛参数异常 */
    public static PostStatus of(String value) {
        if (value == null || value.isBlank()) {
            throw new BizException(ErrorCode.PARAM_INVALID, "状态不能为空");
        }
        try {
            return PostStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BizException(ErrorCode.PARAM_INVALID, "非法的状态值：" + value);
        }
    }

    /**
     * 校验 {@code from -> to} 是否合法；非法则抛 {@link ErrorCode#STATE_ILLEGAL}。
     * 相同状态视为幂等（no-op），允许重复调用。
     */
    public static void checkTransition(PostStatus from, PostStatus to) {
        if (from == to) {
            return;
        }
        boolean legal = switch (from) {
            case DRAFT -> to == PUBLISHED;
            case PUBLISHED -> to == ARCHIVED || to == DRAFT;
            case ARCHIVED -> to == DRAFT;
        };
        if (!legal) {
            throw new BizException(ErrorCode.STATE_ILLEGAL,
                    "不允许从「" + from.label + "」流转到「" + to.label + "」");
        }
    }
}
