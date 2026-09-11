package com.luoji.blog.common.enums;

import com.luoji.blog.common.BizException;
import com.luoji.blog.common.ErrorCode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * 文章状态机单元测试（阶段四核心机制）。
 *
 * <p>验证合法流转边的允许，以及非法流转（如「已归档 → 已发布」）抛出
 * {@link ErrorCode#STATE_ILLEGAL}，说明业务规则被收敛到枚举、而非散落的 if。
 */
class PostStatusTest {

    @Test
    void 草稿可以发布() {
        assertDoesNotThrow(() -> PostStatus.checkTransition(PostStatus.DRAFT, PostStatus.PUBLISHED));
    }

    @Test
    void 已发布可以归档() {
        assertDoesNotThrow(() -> PostStatus.checkTransition(PostStatus.PUBLISHED, PostStatus.ARCHIVED));
    }

    @Test
    void 已发布可以下架为草稿() {
        assertDoesNotThrow(() -> PostStatus.checkTransition(PostStatus.PUBLISHED, PostStatus.DRAFT));
    }

    @Test
    void 已归档可以恢复为草稿() {
        assertDoesNotThrow(() -> PostStatus.checkTransition(PostStatus.ARCHIVED, PostStatus.DRAFT));
    }

    @Test
    void 已归档不能直接发布() {
        BizException e = assertThrows(BizException.class,
                () -> PostStatus.checkTransition(PostStatus.ARCHIVED, PostStatus.PUBLISHED));
        assertEquals(ErrorCode.STATE_ILLEGAL, e.getErrorCode());
    }

    @Test
    void 草稿不能直接归档() {
        BizException e = assertThrows(BizException.class,
                () -> PostStatus.checkTransition(PostStatus.DRAFT, PostStatus.ARCHIVED));
        assertEquals(ErrorCode.STATE_ILLEGAL, e.getErrorCode());
    }
}
