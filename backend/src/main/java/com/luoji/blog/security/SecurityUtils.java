package com.luoji.blog.security;

import com.luoji.blog.common.BizException;
import com.luoji.blog.common.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 便捷获取当前登录用户。
 *
 * <p>Service 层取「当前操作人」一律走这里，不依赖 HttpServletRequest。
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    /** 获取当前登录用户；未登录时抛业务异常 */
    public static LoginUser getLoginUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser;
        }
        throw new BizException(ErrorCode.UNAUTHORIZED);
    }

    /** 获取当前登录用户 id */
    public static Long getUserId() {
        return getLoginUser().id();
    }
}
