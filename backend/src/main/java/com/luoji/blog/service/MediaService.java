package com.luoji.blog.service;

import com.luoji.blog.common.PageResult;
import com.luoji.blog.vo.MediaVO;
import org.springframework.web.multipart.MultipartFile;

/** 媒体服务 */
public interface MediaService {

    /** 上传图片，返回其信息（含可访问 URL） */
    MediaVO upload(MultipartFile file, Long uploaderId);

    PageResult<MediaVO> page(long page, long size);

    void delete(Long id);
}
