package com.luoji.blog.controller;

import com.luoji.blog.common.Result;
import com.luoji.blog.dto.SiteConfigSaveDTO;
import com.luoji.blog.service.SiteConfigService;
import com.luoji.blog.vo.SiteConfigVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 站点配置接口。读取公开，保存仅管理员。 */
@Tag(name = "05. 站点配置")
@RestController
@RequestMapping("/api/site-config")
@RequiredArgsConstructor
public class SiteConfigController {

    private final SiteConfigService siteConfigService;

    @Operation(summary = "读取站点配置（公开）")
    @GetMapping
    public Result<SiteConfigVO> get() {
        return Result.ok(siteConfigService.get());
    }

    @Operation(summary = "保存站点配置")
    @PutMapping
    public Result<Void> update(@Valid @RequestBody SiteConfigSaveDTO dto) {
        siteConfigService.update(dto);
        return Result.ok();
    }
}
