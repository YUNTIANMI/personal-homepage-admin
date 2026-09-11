package com.luoji.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.luoji.blog.common.BizException;
import com.luoji.blog.common.ErrorCode;
import com.luoji.blog.common.PageResult;
import com.luoji.blog.dto.ProjectLink;
import com.luoji.blog.dto.ProjectSaveDTO;
import com.luoji.blog.entity.Project;
import com.luoji.blog.mapper.ProjectMapper;
import com.luoji.blog.service.ProjectService;
import com.luoji.blog.vo.ProjectVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

/**
 * 项目服务实现。
 *
 * <p>{@code tech} / {@code links} 是数据库 JSON 列，这里以 {@code String} 承载，
 * 读写时用 Jackson 完成「JSON 字符串 ↔ 集合对象」的转换。
 */
@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectMapper projectMapper;
    private final ObjectMapper objectMapper;

    @Override
    public PageResult<ProjectVO> page(long page, long size, String keyword) {
        long pageNo = Math.max(1, page);
        long sz = Math.min(Math.max(1, size), 200);

        LambdaQueryWrapper<Project> qw = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            String kw = keyword.trim();
            qw.and(w -> w.like(Project::getName, kw).or().like(Project::getTagline, kw));
        }
        qw.orderByDesc(Project::getIsTop).orderByDesc(Project::getSort).orderByAsc(Project::getName);

        Page<Project> p = projectMapper.selectPage(new Page<>(pageNo, sz), qw);
        return PageResult.of(p, this::toVO);
    }

    @Override
    public ProjectVO get(Long id) {
        Project project = projectMapper.selectById(id);
        if (project == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        return toVO(project);
    }

    @Override
    public Long create(ProjectSaveDTO dto) {
        Project project = new Project();
        applyDraft(project, dto);
        project.setIsTop(0);
        project.setSort(0);
        projectMapper.insert(project);
        return project.getId();
    }

    @Override
    public void update(Long id, ProjectSaveDTO dto) {
        Project project = projectMapper.selectById(id);
        if (project == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        applyDraft(project, dto);
        projectMapper.updateById(project);
    }

    @Override
    public void delete(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        projectMapper.deleteBatchIds(ids);
    }

    /* ---------------- 内部方法 ---------------- */

    private void applyDraft(Project project, ProjectSaveDTO dto) {
        project.setName(dto.getName().trim());
        project.setTagline(dto.getTagline() == null ? "" : dto.getTagline().trim());

        List<ProjectLink> links = normalizeLinks(dto.getLinks());
        validateLinks(links);
        project.setLinks(toJson(links));
        project.setTech(toJson(dto.getTech() == null ? List.of() : dto.getTech()));
    }

    /** 过滤空项、补齐缺失的 id、去除首尾空白 */
    private List<ProjectLink> normalizeLinks(List<ProjectLink> links) {
        if (links == null) {
            return List.of();
        }
        return links.stream()
                .filter(l -> l != null && StringUtils.hasText(l.getLabel()) && StringUtils.hasText(l.getHref()))
                .map(l -> {
                    if (!StringUtils.hasText(l.getId())) {
                        l.setId(UUID.randomUUID().toString());
                    }
                    l.setLabel(l.getLabel().trim());
                    l.setHref(l.getHref().trim());
                    return l;
                })
                .toList();
    }

    private void validateLinks(List<ProjectLink> links) {
        if (links.isEmpty()) {
            throw new BizException(ErrorCode.PARAM_INVALID, "至少需要 1 条外链");
        }
        for (ProjectLink link : links) {
            String href = link.getHref();
            if (!href.startsWith("http://") && !href.startsWith("https://")) {
                throw new BizException(ErrorCode.PARAM_INVALID, "外链地址需以 http(s):// 开头");
            }
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("JSON 序列化失败", e);
        }
    }

    private ProjectVO toVO(Project project) {
        return ProjectVO.builder()
                .id(project.getId())
                .name(project.getName())
                .tagline(project.getTagline())
                .tech(readJson(project.getTech(), new TypeReference<List<String>>() {
                }))
                .links(readJson(project.getLinks(), new TypeReference<List<ProjectLink>>() {
                }))
                .build();
    }

    private <T> T readJson(String json, TypeReference<T> type) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("JSON 解析失败", e);
        }
    }
}
