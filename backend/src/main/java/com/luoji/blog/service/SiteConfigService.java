package com.luoji.blog.service;

import com.luoji.blog.dto.SiteConfigSaveDTO;
import com.luoji.blog.vo.SiteConfigVO;

/** 站点配置服务 */
public interface SiteConfigService {

    SiteConfigVO get();

    void update(SiteConfigSaveDTO dto);
}
