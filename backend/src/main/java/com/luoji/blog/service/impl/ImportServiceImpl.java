package com.luoji.blog.service.impl;

import com.luoji.blog.dto.ImportPayload;
import com.luoji.blog.dto.PostSaveDTO;
import com.luoji.blog.dto.ProjectSaveDTO;
import com.luoji.blog.dto.SiteConfigSaveDTO;
import com.luoji.blog.service.ImportService;
import com.luoji.blog.service.PostService;
import com.luoji.blog.service.ProjectService;
import com.luoji.blog.service.SiteConfigService;
import com.luoji.blog.vo.ImportResult;
import com.luoji.blog.vo.PostVO;
import com.luoji.blog.vo.ProjectVO;
import com.luoji.blog.vo.SiteConfigVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * 数据导入服务实现。
 *
 * <p>导入在一个事务内完成：任一条记录写入失败，此前已写入的全部回滚，
 * 不会出现「导入到一半失败导致脏数据」的中间态。这是「事务保证批量一致性」的典型场景。
 */
@Service
@RequiredArgsConstructor
public class ImportServiceImpl implements ImportService {

    private final PostService postService;
    private final ProjectService projectService;
    private final SiteConfigService siteConfigService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ImportResult importAll(ImportPayload payload, Long operatorId) {
        ImportResult result = new ImportResult();

        if (payload.getPosts() != null) {
            for (PostVO vo : payload.getPosts()) {
                postService.create(toPostSaveDTO(vo), operatorId);
                result.setPostsAdded(result.getPostsAdded() + 1);
            }
        }
        if (payload.getProjects() != null) {
            for (ProjectVO vo : payload.getProjects()) {
                projectService.create(toProjectSaveDTO(vo));
                result.setProjectsAdded(result.getProjectsAdded() + 1);
            }
        }
        if (payload.getSiteProfile() != null) {
            siteConfigService.update(toSiteConfigSaveDTO(payload.getSiteProfile()));
            result.setSiteUpdated(true);
        }
        return result;
    }

    private PostSaveDTO toPostSaveDTO(PostVO vo) {
        PostSaveDTO dto = new PostSaveDTO();
        dto.setTitle(vo.getTitle());
        dto.setDate(vo.getDate() != null ? LocalDate.parse(vo.getDate()) : LocalDate.now());
        dto.setCategory(vo.getCategory());
        dto.setTags(vo.getTags());
        dto.setSummary(vo.getDescription());
        dto.setContent(vo.getContent());
        return dto;
    }

    private ProjectSaveDTO toProjectSaveDTO(ProjectVO vo) {
        ProjectSaveDTO dto = new ProjectSaveDTO();
        dto.setName(vo.getName());
        dto.setTagline(vo.getTagline());
        dto.setTech(vo.getTech());
        dto.setLinks(vo.getLinks());
        return dto;
    }

    private SiteConfigSaveDTO toSiteConfigSaveDTO(SiteConfigVO vo) {
        SiteConfigSaveDTO dto = new SiteConfigSaveDTO();
        dto.setName(vo.getName());
        dto.setEn(vo.getEn());
        dto.setRole(vo.getRole());
        dto.setHeadline(vo.getHeadline());
        dto.setIntro(vo.getIntro());
        dto.setGithub(vo.getGithub());
        dto.setEmail(vo.getEmail());
        dto.setTech(vo.getTech());
        dto.setStartYear(vo.getStartYear());
        return dto;
    }
}
