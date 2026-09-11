package com.luoji.blog.aspect;

import com.luoji.blog.annotation.OperationLog;
import com.luoji.blog.security.SecurityUtils;
import com.luoji.blog.service.OperationLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 操作审计切面。
 *
 * <p>用 {@code @Around} 环绕带 {@link OperationLog} 注解的 Controller 方法：
 * 主线程收集「用户 / IP / 目标 id / 耗时 / 是否成功」，交给
 * {@link OperationLogService#record} 异步落库，不阻塞主流程。
 *
 * <p>记录逻辑零侵入：新增一个写接口只需加一行注解。
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class OperationLogAspect {

    private final OperationLogService operationLogService;

    @Around("@annotation(operationLog)")
    public Object around(ProceedingJoinPoint pjp, OperationLog operationLog) throws Throwable {
        long start = System.currentTimeMillis();
        boolean success = true;
        try {
            return pjp.proceed();
        } catch (Throwable e) {
            success = false;
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - start;
            try {
                operationLogService.record(
                        operationLog.module().name(),
                        operationLog.action(),
                        extractTargetId(pjp),
                        currentUserId(),
                        currentUsername(),
                        currentIp(),
                        success,
                        (int) duration);
            } catch (Exception e) {
                // 审计日志失败不应影响主流程
                log.warn("[审计日志] 记录失败：{}", e.getMessage());
            }
        }
    }

    /** 从方法参数里提取第一个 Long 作为目标 id */
    private Long extractTargetId(ProceedingJoinPoint pjp) {
        for (Object arg : pjp.getArgs()) {
            if (arg instanceof Long id) {
                return id;
            }
        }
        return null;
    }

    private Long currentUserId() {
        try {
            return SecurityUtils.getUserId();
        } catch (Exception e) {
            return null;
        }
    }

    private String currentUsername() {
        try {
            return SecurityUtils.getLoginUser().username();
        } catch (Exception e) {
            return "";
        }
    }

    private String currentIp() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return "";
        }
        HttpServletRequest request = attrs.getRequest();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
