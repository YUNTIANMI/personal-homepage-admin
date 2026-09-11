package com.luoji.blog.controller;

import com.luoji.blog.common.PageResult;
import com.luoji.blog.common.Result;
import com.luoji.blog.security.SecurityUtils;
import com.luoji.blog.service.MediaService;
import com.luoji.blog.vo.MediaVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** 媒体接口。上传 / 列表 / 删除。 */
@Tag(name = "04. 媒体")
@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    @Operation(summary = "上传图片")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<MediaVO> upload(@RequestParam("file") MultipartFile file) {
        return Result.ok(mediaService.upload(file, SecurityUtils.getUserId()));
    }

    @Operation(summary = "媒体分页列表")
    @GetMapping
    public Result<PageResult<MediaVO>> page(@RequestParam(defaultValue = "1") long page,
                                            @RequestParam(defaultValue = "20") long size) {
        return Result.ok(mediaService.page(page, size));
    }

    @Operation(summary = "删除图片")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        mediaService.delete(id);
        return Result.ok();
    }
}
