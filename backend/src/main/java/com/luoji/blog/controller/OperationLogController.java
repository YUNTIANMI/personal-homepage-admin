package com.luoji.blog.controller;

import com.luoji.blog.common.PageResult;
import com.luoji.blog.common.Result;
import com.luoji.blog.service.OperationLogService;
import com.luoji.blog.vo.OperationLogVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 操作审计日志接口。 */
@Tag(name = "07. 审计日志")
@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class OperationLogController {

    private final OperationLogService operationLogService;

    @Operation(summary = "操作日志分页查询（可按模块筛选）")
    @GetMapping("/operation")
    public Result<PageResult<OperationLogVO>> page(@RequestParam(defaultValue = "1") long page,
                                                   @RequestParam(defaultValue = "20") long size,
                                                   @RequestParam(required = false) String module) {
        return Result.ok(operationLogService.page(page, size, module));
    }
}
