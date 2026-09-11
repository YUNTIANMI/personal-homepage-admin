package com.luoji.blog.vo;

import com.luoji.blog.dto.ProjectLink;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/** 项目出参 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectVO {

    private Long id;

    private String name;

    private String tagline;

    private List<String> tech;

    private List<ProjectLink> links;
}
