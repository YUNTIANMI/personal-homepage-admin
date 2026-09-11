package com.luoji.blog.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/** 仪表盘统计 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsVO {

    private long postCount;

    private long projectCount;

    private long publishedCount;

    private long draftCount;

    private List<PostVO> recentPosts;
}
