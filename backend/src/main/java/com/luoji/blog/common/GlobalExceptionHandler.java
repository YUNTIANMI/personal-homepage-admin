package com.luoji.blog.common;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 全局异常处理。
 *
 * <p>把「各类异常」统一转换成 {@link Result}，并让 HTTP 状态码与
 * {@link ErrorCode#httpStatus()} 保持一致。Controller 内因此不需要任何 try-catch。
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /* ---------------- 业务异常：可预期 ---------------- */

    @ExceptionHandler(BizException.class)
    public ResponseEntity<Result<Void>> handleBiz(BizException e) {
        log.warn("[业务异常] code={} message={}", e.getErrorCode().getCode(), e.getMessage());
        return ResponseEntity.status(e.getErrorCode().httpStatus())
                .body(Result.fail(e.getErrorCode(), e.getMessage()));
    }

    /* ---------------- 参数校验失败：统一 400 ---------------- */

    /** {@code @RequestBody} 上的 {@code @Valid} 校验失败 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleMethodArgumentNotValid(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse(ErrorCode.PARAM_INVALID.getMessage());
        log.warn("[参数校验失败] {}", message);
        return badRequest(message);
    }

    /** 方法参数上的 {@code @Validated} 约束失败（如 {@code @NotBlank @RequestParam}） */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Result<Void>> handleConstraintViolation(ConstraintViolationException e) {
        String message = e.getConstraintViolations().stream()
                .findFirst()
                .map(v -> v.getMessage())
                .orElse(ErrorCode.PARAM_INVALID.getMessage());
        log.warn("[参数约束失败] {}", message);
        return badRequest(message);
    }

    /** 请求体不是合法 JSON */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Result<Void>> handleNotReadable(HttpMessageNotReadableException e) {
        log.warn("[请求体解析失败] {}", e.getMessage());
        return badRequest("请求体格式不正确");
    }

    /** 缺少必填的查询参数 */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Result<Void>> handleMissingParam(MissingServletRequestParameterException e) {
        log.warn("[缺少参数] {}", e.getParameterName());
        return badRequest("缺少参数：" + e.getParameterName());
    }

    /** 参数类型不匹配（如把 abc 传给 Long） */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Result<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        log.warn("[参数类型不匹配] {}", e.getName());
        return badRequest("参数格式不正确：" + e.getName());
    }

    /* ---------------- 404 / 405 ---------------- */

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Result<Void>> handleNoResource(NoResourceFoundException e) {
        return ResponseEntity.status(ErrorCode.NOT_FOUND.httpStatus())
                .body(Result.fail(ErrorCode.NOT_FOUND));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Result<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        log.warn("[请求方法不支持] {}", e.getMethod());
        return ResponseEntity.status(405)
                .body(Result.fail(ErrorCode.PARAM_INVALID, "请求方法不支持：" + e.getMethod()));
    }

    /* ---------------- 403 无权限 ---------------- */

    /**
     * 方法级 {@code @PreAuthorize} 校验失败会抛出 AccessDeniedException。
     *
     * <p><b>为什么必须单独处理</b>：该异常在 DispatcherServlet 内被抛出，
     * 若不显式处理，会被下面的 {@code Exception.class} 兜底误判为「服务器内部错误」返回 500。
     * 这里拦截并正确映射为 403。
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Result<Void>> handleAccessDenied(AccessDeniedException e) {
        log.warn("[无权限] {}", e.getMessage());
        return ResponseEntity.status(ErrorCode.FORBIDDEN.httpStatus())
                .body(Result.fail(ErrorCode.FORBIDDEN));
    }

    /* ---------------- 兜底：不可预期 ---------------- */

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleUnexpected(Exception e) {
        // 只有这一条打印完整堆栈；业务异常与校验失败只打一行 warn
        log.error("[未预期异常] {}", e.getMessage(), e);
        return ResponseEntity.status(ErrorCode.SERVER_ERROR.httpStatus())
                .body(Result.fail(ErrorCode.SERVER_ERROR));
    }

    private ResponseEntity<Result<Void>> badRequest(String message) {
        return ResponseEntity.status(ErrorCode.PARAM_INVALID.httpStatus())
                .body(Result.fail(ErrorCode.PARAM_INVALID, message));
    }
}
