package com.luoji.blog.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/** 站点配置出参 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SiteConfigVO {

    private String name;

    private String en;

    private String role;

    private String headline;

    private String intro;

    private String github;

    private String email;

    private List<String> tech;

    private Integer startYear;
}
