package com.luoji.blog.vo;

import lombok.Getter;
import lombok.Setter;

/** 导入结果统计 */
@Getter
@Setter
public class ImportResult {

    private int postsAdded;

    private int projectsAdded;

    private boolean siteUpdated;
}
