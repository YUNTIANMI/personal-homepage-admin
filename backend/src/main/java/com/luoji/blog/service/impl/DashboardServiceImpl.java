package com.luoji.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.luoji.blog.entity.Post;
import com.luoji.blog.mapper.PostMapper;
import com.luoji.blog.mapper.ProjectMapper;
import com.luoji.blog.service.DashboardService;
import com.luoji.blog.vo.DashboardStatsVO;
import com.luoji.blog.vo.PostVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/** 仪表盘统计服务实现 */
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final PostMapper postMapper;
    private final ProjectMapper projectMapper;

    @Override
    public DashboardStatsVO stats() {
        long postCount = postMapper.selectCount(null);
        long projectCount = projectMapper.selectCount(null);
        long publishedCount = postMapper.selectCount(
                new LambdaQueryWrapper<Post>().eq(Post::getStatus, "PUBLISHED"));
        long draftCount = postMapper.selectCount(
                new LambdaQueryWrapper<Post>().eq(Post::getStatus, "DRAFT"));

        List<PostVO> recent = postMapper.selectList(
                        new LambdaQueryWrapper<Post>()
                                .orderByDesc(Post::getUpdatedAt)
                                .last("LIMIT 6"))
                .stream()
                .map(p -> PostVO.builder()
                        .id(p.getId())
                        .title(p.getTitle())
                        .date(p.getPostDate() == null ? null : p.getPostDate().toString())
                        .status(p.getStatus())
                        .updatedAt(p.getUpdatedAt())
                        .build())
                .toList();

        return DashboardStatsVO.builder()
                .postCount(postCount)
                .projectCount(projectCount)
                .publishedCount(publishedCount)
                .draftCount(draftCount)
                .recentPosts(recent)
                .build();
    }
}
