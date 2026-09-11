package com.luoji.blog.common;

import lombok.Getter;

/**
 * 业务错误码。
 *
 * <p><b>编码约定</b>：错误码 = HTTP 状态码 × 100 + 两位业务序号，
 * 因此 {@link #httpStatus()} 可直接由错误码推导出应返回的 HTTP 状态码。
 * 例如 {@code 40900 -> 409}、{@code 40101 -> 401}。
 *
 * <p>这样设计的好处：HTTP 状态码负责表达「传输 / 语义」层面的结果（便于网关、浏览器、
 * 前端拦截器统一处理），业务错误码负责表达「具体是哪一种业务失败」（便于前端精确提示）。
 */
@Getter
public enum ErrorCode {

    /** 成功（唯一的非错误码） */
    SUCCESS(0, "成功"),

    /* ---------- 400 参数与请求 ---------- */
    PARAM_INVALID(40000, "参数校验失败"),
    FILE_TOO_LARGE(40001, "文件超过大小限制"),
    FILE_TYPE_NOT_ALLOWED(40002, "文件类型不支持"),

    /* ---------- 401 未认证 ---------- */
    UNAUTHORIZED(40100, "未登录或登录已过期"),
    TOKEN_EXPIRED(40101, "登录已过期，请重新登录"),
    BAD_CREDENTIALS(40102, "用户名或密码错误"),

    /* ---------- 403 无权限 ---------- */
    FORBIDDEN(40300, "没有操作权限"),

    /* ---------- 404 资源不存在 ---------- */
    NOT_FOUND(40400, "资源不存在"),

    /* ---------- 409 状态 / 并发冲突 ---------- */
    VERSION_CONFLICT(40900, "内容已被他人修改，请刷新后重试"),
    STATE_ILLEGAL(40901, "当前状态不允许该操作"),

    /* ---------- 423 账号锁定 ---------- */
    ACCOUNT_LOCKED(42300, "账号已锁定，请稍后再试"),

    /* ---------- 500 服务端 ---------- */
    SERVER_ERROR(50000, "服务器内部错误");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    /** 由业务错误码推导出应返回的 HTTP 状态码 */
    public int httpStatus() {
        return code == 0 ? 200 : code / 100;
    }
}
