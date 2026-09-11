package com.luoji.blog.service.impl;

import com.luoji.blog.dto.ImportPayload;
import com.luoji.blog.dto.PostQueryDTO;
import com.luoji.blog.service.ExportService;
import com.luoji.blog.service.PostService;
import com.luoji.blog.service.ProjectService;
import com.luoji.blog.service.SiteConfigService;
import com.luoji.blog.vo.PostVO;
import com.luoji.blog.vo.ProjectVO;
import com.luoji.blog.vo.SiteConfigVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** 数据导出服务实现（个人站点数据量小，用单页上限一次性取回全量） */
@Service
@RequiredArgsConstructor
public class ExportServiceImpl implements ExportService {

    private final PostService postService;
    private final ProjectService projectService;
    private final SiteConfigService siteConfigService;

    @Override
    public ImportPayload export() {
        PostQueryDTO pq = new PostQueryDTO();
        pq.setSize(200);
        List<PostVO> posts = postService.page(pq).getRecords();

        List<ProjectVO> projects = projectService.page(1, 200, null).getRecords();
        SiteConfigVO site = siteConfigService.get();

        ImportPayload payload = new ImportPayload();
        payload.setVersion(1);
        payload.setExportedAt(LocalDateTime.now().toString());
        payload.setPosts(posts);
        payload.setProjects(projects);
        payload.setSiteProfile(site);
        return payload;
    }
}
