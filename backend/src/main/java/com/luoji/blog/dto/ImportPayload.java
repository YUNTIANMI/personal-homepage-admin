package com.luoji.blog.dto;

import com.luoji.blog.vo.PostVO;
import com.luoji.blog.vo.ProjectVO;
import com.luoji.blog.vo.SiteConfigVO;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 导入 / 导出的全量数据载荷。
 *
 * <p>与前端 SettingsPage 的备份文件结构保持一致：
 * {@code version} + {@code exportedAt} + {@code posts} + {@code projects} + {@code siteProfile}。
 */
@Getter
@Setter
public class ImportPayload {

    private Integer version;

    private String exportedAt;

    private List<PostVO> posts;

    private List<ProjectVO> projects;

    private SiteConfigVO siteProfile;
}
