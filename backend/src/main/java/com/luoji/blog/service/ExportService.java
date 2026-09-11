package com.luoji.blog.service;

import com.luoji.blog.dto.ImportPayload;

/** 数据导出服务 */
public interface ExportService {

    /** 导出全量数据（文章 / 项目 / 站点配置）为统一载荷 */
    ImportPayload export();
}
