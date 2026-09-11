package com.luoji.blog.controller;

import com.luoji.blog.common.PageResult;
import com.luoji.blog.common.Result;
import com.luoji.blog.dto.ProjectSaveDTO;
import com.luoji.blog.service.ProjectService;
import com.luoji.blog.vo.ProjectVO;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 项目接口。列表 / 详情为公开只读。 */
@Tag(name = "03. 项目")
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @Operation(summary = "项目分页列表（公开）")
    @GetMapping
    public Result<PageResult<ProjectVO>> page(@RequestParam(defaultValue = "1") long page,
                                              @RequestParam(defaultValue = "10") long size,
                                              @RequestParam(required = false) String keyword) {
        return Result.ok(projectService.page(page, size, keyword));
    }

    @Operation(summary = "项目详情（公开）")
    @GetMapping("/{id}")
    public Result<ProjectVO> get(@PathVariable Long id) {
        return Result.ok(projectService.get(id));
    }

    @Operation(summary = "新建项目")
    @PostMapping
    public Result<Long> create(@Valid @RequestBody ProjectSaveDTO dto) {
        return Result.ok(projectService.create(dto));
    }

    @Operation(summary = "编辑项目")
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody ProjectSaveDTO dto) {
        projectService.update(id, dto);
        return Result.ok();
    }

    @Operation(summary = "删除项目（逻辑删除）")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        projectService.delete(List.of(id));
        return Result.ok();
    }
}
