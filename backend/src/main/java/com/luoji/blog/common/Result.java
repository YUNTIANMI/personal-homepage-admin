package com.luoji.blog.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

/**
 * 统一响应体。
 *
 * <p>所有接口（含异常路径）都返回这个结构，前端只需处理一种格式：
 * <pre>{ "code": 0, "message": "成功", "data": { ... } }</pre>
 *
 * <p>{@code code} 为 0 表示成功；非 0 时其取值见 {@link ErrorCode}。
 */
@Getter
@Schema(description = "统一响应体")
public class Result<T> {

    @Schema(description = "业务状态码，0 表示成功", example = "0")
    private final int code;

    @Schema(description = "提示信息", example = "成功")
    private final String message;

    @Schema(description = "业务数据；失败时为 null")
    private final T data;

    private Result(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    /** 成功，无数据 */
    public static <T> Result<T> ok() {
        return new Result<>(ErrorCode.SUCCESS.getCode(), ErrorCode.SUCCESS.getMessage(), null);
    }

    /** 成功，带数据 */
    public static <T> Result<T> ok(T data) {
        return new Result<>(ErrorCode.SUCCESS.getCode(), ErrorCode.SUCCESS.getMessage(), data);
    }

    /** 失败，使用错误码自带的提示 */
    public static <T> Result<T> fail(ErrorCode errorCode) {
        return new Result<>(errorCode.getCode(), errorCode.getMessage(), null);
    }

    /** 失败，自定义提示（用于携带更明确的上下文，如「标题不能为空」） */
    public static <T> Result<T> fail(ErrorCode errorCode, String message) {
        return new Result<>(errorCode.getCode(), message, null);
    }
}
