package com.luoji.blog.controller;

import com.luoji.blog.annotation.OperationLog;
import com.luoji.blog.common.Result;
import com.luoji.blog.common.enums.LogModule;
import com.luoji.blog.dto.ImportPayload;
import com.luoji.blog.security.SecurityUtils;
import com.luoji.blog.service.ExportService;
import com.luoji.blog.service.ImportService;
import com.luoji.blog.vo.ImportResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 数据备份与恢复（导出 / 导入）。 */
@Tag(name = "08. 数据备份")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExportImportController {

    private final ExportService exportService;
    private final ImportService importService;

    @Operation(summary = "导出全量数据")
    @GetMapping("/export")
    public Result<ImportPayload> export() {
        return Result.ok(exportService.export());
    }

    @Operation(summary = "导入全量数据（事务写入，失败整体回滚）")
    @OperationLog(module = LogModule.POST, action = "IMPORT")
    @PostMapping("/import")
    public Result<ImportResult> importAll(@RequestBody ImportPayload payload) {
        return Result.ok(importService.importAll(payload, SecurityUtils.getUserId()));
    }
}
