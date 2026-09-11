package com.luoji.blog.controller;

import com.luoji.blog.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 阶段二的权限验证演示接口。
 *
 * <p>仅用于验证 {@code @PreAuthorize} 的角色校验是否生效，
 * 阶段三起会被真实的业务接口（文章 / 项目 / 媒体等）取代。
 */
@Tag(name = "阶段二权限演示")
@RestController
@RequestMapping("/api/demo")
public class PermissionDemoController {

    @Operation(summary = "仅 ADMIN 可访问")
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Result<String> adminOnly() {
        return Result.ok("ADMIN 角色验证通过");
    }

    @Operation(summary = "ADMIN / EDITOR 可访问")
    @GetMapping("/editor")
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    public Result<String> editorOrAdmin() {
        return Result.ok("内容角色（ADMIN / EDITOR）验证通过");
    }
}
