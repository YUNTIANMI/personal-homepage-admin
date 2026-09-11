package com.luoji.blog.common;

import lombok.Getter;

/**
 * 业务异常。
 *
 * <p>Service 层遇到「可预期的业务失败」时抛这个异常（如状态不允许、版本冲突、资源不存在），
 * 由 {@link GlobalExceptionHandler} 统一转换成 {@link Result}。
 *
 * <p>Controller 与 Service <b>不需要</b>写 try-catch。
 */
@Getter
public class BizException extends RuntimeException {

    private final ErrorCode errorCode;

    public BizException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    /** 使用错误码的 HTTP 语义，但给出更具体的提示文案 */
    public BizException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public static BizException of(ErrorCode errorCode) {
        return new BizException(errorCode);
    }

    public static BizException of(ErrorCode errorCode, String message) {
        return new BizException(errorCode, message);
    }
}
