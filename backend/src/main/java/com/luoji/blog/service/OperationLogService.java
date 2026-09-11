package com.luoji.blog.service;

import com.luoji.blog.common.PageResult;
import com.luoji.blog.vo.OperationLogVO;

/** 操作审计日志服务 */
public interface OperationLogService {

    /**
     * 异步记录一条操作日志。
     *
     * <p>上下文信息（用户、IP、耗时、结果）由切面在主线程收集后传入，
     * 本方法只做落库，不读取任何 ThreadLocal 上下文（@Async 线程里拿不到）。
     */
    void record(String module, String action, Long targetId, Long userId, String username,
                String ip, boolean success, int durationMs);

    /** 分页查询审计日志（可按模块筛选） */
    PageResult<OperationLogVO> page(long page, long size, String module);
}
