package com.luoji.blog.controller;

import com.luoji.blog.common.PageResult;
import com.luoji.blog.common.Result;
import com.luoji.blog.dto.PostQueryDTO;
import com.luoji.blog.dto.PostSaveDTO;
import com.luoji.blog.security.SecurityUtils;
import com.luoji.blog.service.PostService;
import com.luoji.blog.vo.PostVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 文章接口。列表 / 详情为公开只读，写操作用于后台。 */
@Tag(name = "02. 文章")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @Operation(summary = "文章分页列表（公开）")
    @GetMapping("/posts")
    public Result<PageResult<PostVO>> page(PostQueryDTO query) {
        return Result.ok(postService.page(query));
    }

    @Operation(summary = "文章详情（公开）")
    @GetMapping("/posts/{id}")
    public Result<PostVO> get(@PathVariable Long id) {
        return Result.ok(postService.get(id));
    }

    @Operation(summary = "新建文章")
    @PostMapping("/posts")
    public Result<Long> create(@Valid @RequestBody PostSaveDTO dto) {
        return Result.ok(postService.create(dto, SecurityUtils.getUserId()));
    }

    @Operation(summary = "编辑文章")
    @PutMapping("/posts/{id}")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody PostSaveDTO dto) {
        postService.update(id, dto);
        return Result.ok();
    }

    @Operation(summary = "删除单篇文章（逻辑删除）")
    @DeleteMapping("/posts/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        postService.delete(List.of(id));
        return Result.ok();
    }

    @Operation(summary = "批量删除文章（逻辑删除）")
    @DeleteMapping("/posts")
    public Result<Void> deleteBatch(@RequestBody List<Long> ids) {
        postService.delete(ids);
        return Result.ok();
    }

    @Operation(summary = "全部标签（公开）")
    @GetMapping("/tags")
    public Result<List<String>> tags() {
        return Result.ok(postService.listTags());
    }
}
