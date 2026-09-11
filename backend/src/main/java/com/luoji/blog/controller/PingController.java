package com.luoji.blog.controller;

import com.luoji.blog.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 连通性检查。
 *
 * <p>阶段一用于验证「应用启动 → 统一响应体 → 接口文档」整条链路是否打通。
 * 阶段六会由 Actuator 的健康检查承接更完整的探活能力。
 */
@Tag(name = "00. 健康检查")
@RestController
@RequestMapping("/api")
public class PingController {

    @Operation(summary = "连通性检查", description = "返回固定字符串 pong，用于快速确认服务可用")
    @GetMapping("/ping")
    public Result<String> ping() {
        return Result.ok("pong");
    }
}
