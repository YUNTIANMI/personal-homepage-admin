package com.luoji.blog.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 统一响应体与错误码的单元测试（纯逻辑，不依赖 Spring 容器与数据库）。
 */
class ResultTest {

    @Test
    @DisplayName("成功响应：code 为 0、message 为「成功」、携带数据")
    void okShouldCarryData() {
        Result<String> result = Result.ok("pong");

        assertThat(result.getCode()).isZero();
        assertThat(result.getMessage()).isEqualTo("成功");
        assertThat(result.getData()).isEqualTo("pong");
    }

    @Test
    @DisplayName("成功无数据：data 为 null")
    void okWithoutDataShouldHaveNullData() {
        Result<Void> result = Result.ok();

        assertThat(result.getCode()).isZero();
        assertThat(result.getData()).isNull();
    }

    @Test
    @DisplayName("失败响应：携带错误码自带的提示，data 为 null")
    void failShouldCarryErrorCode() {
        Result<Void> result = Result.fail(ErrorCode.NOT_FOUND);

        assertThat(result.getCode()).isEqualTo(40400);
        assertThat(result.getMessage()).isEqualTo("资源不存在");
        assertThat(result.getData()).isNull();
    }

    @Test
    @DisplayName("失败响应：允许覆盖为更具体的提示文案")
    void failShouldAllowCustomMessage() {
        Result<Void> result = Result.fail(ErrorCode.PARAM_INVALID, "标题不能为空");

        assertThat(result.getCode()).isEqualTo(40000);
        assertThat(result.getMessage()).isEqualTo("标题不能为空");
    }

    @Test
    @DisplayName("业务错误码可推导出对应的 HTTP 状态码")
    void errorCodeShouldDeriveHttpStatus() {
        assertThat(ErrorCode.SUCCESS.httpStatus()).isEqualTo(200);
        assertThat(ErrorCode.PARAM_INVALID.httpStatus()).isEqualTo(400);
        assertThat(ErrorCode.UNAUTHORIZED.httpStatus()).isEqualTo(401);
        assertThat(ErrorCode.TOKEN_EXPIRED.httpStatus()).isEqualTo(401);
        assertThat(ErrorCode.FORBIDDEN.httpStatus()).isEqualTo(403);
        assertThat(ErrorCode.NOT_FOUND.httpStatus()).isEqualTo(404);
        assertThat(ErrorCode.VERSION_CONFLICT.httpStatus()).isEqualTo(409);
        assertThat(ErrorCode.STATE_ILLEGAL.httpStatus()).isEqualTo(409);
        assertThat(ErrorCode.ACCOUNT_LOCKED.httpStatus()).isEqualTo(423);
        assertThat(ErrorCode.SERVER_ERROR.httpStatus()).isEqualTo(500);
    }
}
