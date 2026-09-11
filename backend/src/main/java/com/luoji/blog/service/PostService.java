package com.luoji.blog.service;

import com.luoji.blog.common.PageResult;
import com.luoji.blog.dto.PostQueryDTO;
import com.luoji.blog.dto.PostSaveDTO;
import com.luoji.blog.vo.PostVO;

import java.util.List;

/** 文章服务 */
public interface PostService {

    /** 分页列表（服务端分页 + 关键词搜索 + 排序） */
    PageResult<PostVO> page(PostQueryDTO query);

    /** 详情 */
    PostVO get(Long id);

    /** 新建，返回新文章 id */
    Long create(PostSaveDTO dto, Long authorId);

    /** 编辑 */
    void update(Long id, PostSaveDTO dto);

    /** 逻辑删除（单个或多个） */
    void delete(List<Long> ids);

    /** 全部标签名（去重） */
    List<String> listTags();
}
