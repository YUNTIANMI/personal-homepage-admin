package com.luoji.blog.controller;

import com.luoji.blog.annotation.OperationLog;
import com.luoji.blog.common.PageResult;
import com.luoji.blog.common.Result;
import com.luoji.blog.common.enums.LogModule;
import com.luoji.blog.dto.PostQueryDTO;
import com.luoji.blog.dto.PostSaveDTO;
import com.luoji.blog.dto.PostStatusDTO;
import com.luoji.blog.dto.PostTopDTO;
import com.luoji.blog.security.SecurityUtils;
import com.luoji.blog.service.PostService;
import com.luoji.blog.vo.PostRevisionVO;
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
        Result<PostVO> result = Result.ok(postService.get(id));
        // 阅读计数：Redis 自增（不经过缓存），由 ViewCountTask 定时批量落库
        postService.recordView(id);
        return result;
    }

    @Operation(summary = "新建文章")
    @OperationLog(module = LogModule.POST, action = "CREATE")
    @PostMapping("/posts")
    public Result<Long> create(@Valid @RequestBody PostSaveDTO dto) {
        return Result.ok(postService.create(dto, SecurityUtils.getUserId()));
    }

    @Operation(summary = "编辑文章")
    @OperationLog(module = LogModule.POST, action = "UPDATE")
    @PutMapping("/posts/{id}")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody PostSaveDTO dto) {
        postService.update(id, dto);
        return Result.ok();
    }

    @Operation(summary = "状态流转（发布 / 归档 / 回退草稿）")
    @OperationLog(module = LogModule.POST, action = "STATUS")
    @PutMapping("/posts/{id}/status")
    public Result<Void> changeStatus(@PathVariable Long id, @Valid @RequestBody PostStatusDTO dto) {
        postService.changeStatus(id, dto, SecurityUtils.getUserId());
        return Result.ok();
    }

    @Operation(summary = "置顶开关与排序权重")
    @OperationLog(module = LogModule.POST, action = "TOP")
    @PutMapping("/posts/{id}/top")
    public Result<Void> toggleTop(@PathVariable Long id, @RequestBody PostTopDTO dto) {
        postService.toggleTop(id, dto);
        return Result.ok();
    }

    @Operation(summary = "回收站列表")
    @GetMapping("/posts/trash")
    public Result<PageResult<PostVO>> trashPage(PostQueryDTO query) {
        return Result.ok(postService.trashPage(query));
    }

    @Operation(summary = "从回收站恢复")
    @OperationLog(module = LogModule.POST, action = "RESTORE")
    @PutMapping("/posts/{id}/restore")
    public Result<Void> restore(@PathVariable Long id) {
        postService.restore(id);
        return Result.ok();
    }

    @Operation(summary = "历史版本列表")
    @GetMapping("/posts/{id}/revisions")
    public Result<List<PostRevisionVO>> revisions(@PathVariable Long id) {
        return Result.ok(postService.listRevisions(id));
    }

    @Operation(summary = "回滚到指定历史版本")
    @OperationLog(module = LogModule.POST, action = "ROLLBACK")
    @PostMapping("/posts/{id}/revisions/{version}/rollback")
    public Result<PostVO> rollback(@PathVariable Long id, @PathVariable Integer version) {
        return Result.ok(postService.rollback(id, version, SecurityUtils.getUserId()));
    }

    @Operation(summary = "删除单篇文章（逻辑删除）")
    @OperationLog(module = LogModule.POST, action = "DELETE")
    @DeleteMapping("/posts/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        postService.delete(List.of(id));
        return Result.ok();
    }

    @Operation(summary = "批量删除文章（逻辑删除）")
    @OperationLog(module = LogModule.POST, action = "DELETE")
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
