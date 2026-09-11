package com.luoji.blog.service;

import com.luoji.blog.common.PageResult;
import com.luoji.blog.dto.ProjectSaveDTO;
import com.luoji.blog.vo.ProjectVO;

import java.util.List;

/** 项目服务 */
public interface ProjectService {

    PageResult<ProjectVO> page(long page, long size, String keyword);

    ProjectVO get(Long id);

    Long create(ProjectSaveDTO dto);

    void update(Long id, ProjectSaveDTO dto);

    void delete(List<Long> ids);
}
