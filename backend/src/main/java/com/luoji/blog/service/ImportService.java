package com.luoji.blog.service;

import com.luoji.blog.dto.ImportPayload;
import com.luoji.blog.vo.ImportResult;

/** 数据导入服务 */
public interface ImportService {

    /**
     * 导入全量数据（在一个事务内完成，任一失败整体回滚）。
     *
     * @param payload    导入载荷
     * @param operatorId 操作人 id（作为新增文章的作者）
     */
    ImportResult importAll(ImportPayload payload, Long operatorId);
}
