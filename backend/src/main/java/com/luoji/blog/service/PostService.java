package com.luoji.blog.service;

import com.luoji.blog.common.PageResult;
import com.luoji.blog.dto.PostQueryDTO;
import com.luoji.blog.dto.PostSaveDTO;
import com.luoji.blog.dto.PostStatusDTO;
import com.luoji.blog.dto.PostTopDTO;
import com.luoji.blog.vo.PostRevisionVO;
import com.luoji.blog.vo.PostVO;

import java.util.List;

/** 文章服务 */
public interface PostService {

    /** 分页列表（服务端分页 + 关键词搜索 + 状态筛选 + 排序） */
    PageResult<PostVO> page(PostQueryDTO query);

    /** 详情 */
    PostVO get(Long id);

    /** 新建，返回新文章 id（默认草稿） */
    Long create(PostSaveDTO dto, Long authorId);

    /** 编辑（乐观锁校验） */
    void update(Long id, PostSaveDTO dto);

    /** 逻辑删除（单个或多个，进回收站） */
    void delete(List<Long> ids);

    /** 全部标签名（去重） */
    List<String> listTags();

    /** 状态流转（发布 / 归档 / 回退草稿），发布时在同一事务内留存历史版本快照 */
    void changeStatus(Long id, PostStatusDTO dto, Long editorId);

    /** 置顶开关与排序权重 */
    void toggleTop(Long id, PostTopDTO dto);

    /** 回收站分页列表（已逻辑删除的文章） */
    PageResult<PostVO> trashPage(PostQueryDTO query);

    /** 从回收站恢复 */
    void restore(Long id);

    /** 历史版本列表 */
    List<PostRevisionVO> listRevisions(Long id);

    /** 回滚到指定历史版本（回滚本身也是一次事务，并生成新快照） */
    PostVO rollback(Long id, Integer version, Long editorId);

    /** 记录一次阅读：Redis 自增浏览量，由定时任务批量落库 */
    void recordView(Long id);
}
