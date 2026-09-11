package com.luoji.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.luoji.blog.common.PageResult;
import com.luoji.blog.entity.OperationLog;
import com.luoji.blog.mapper.OperationLogMapper;
import com.luoji.blog.service.OperationLogService;
import com.luoji.blog.vo.OperationLogVO;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** 操作审计日志服务实现 */
@Service
@RequiredArgsConstructor
public class OperationLogServiceImpl implements OperationLogService {

    private final OperationLogMapper operationLogMapper;

    @Override
    @Async
    public void record(String module, String action, Long targetId, Long userId, String username,
                       String ip, boolean success, int durationMs) {
        OperationLog log = new OperationLog();
        log.setUserId(userId);
        log.setUsername(username == null ? "" : username);
        log.setModule(module);
        log.setAction(action);
        log.setTargetId(targetId);
        log.setIp(ip == null ? "" : ip);
        log.setDurationMs(durationMs);
        log.setSuccess(success ? 1 : 0);
        operationLogMapper.insert(log);
    }

    @Override
    public PageResult<OperationLogVO> page(long page, long size, String module) {
        LambdaQueryWrapper<OperationLog> qw = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(module)) {
            qw.eq(OperationLog::getModule, module.trim());
        }
        qw.orderByDesc(OperationLog::getCreatedAt);

        Page<OperationLog> p = operationLogMapper.selectPage(
                new Page<>(Math.max(1, page), Math.min(Math.max(1, size), 200)), qw);
        return PageResult.of(p, this::toVO);
    }

    private OperationLogVO toVO(OperationLog log) {
        return OperationLogVO.builder()
                .id(log.getId())
                .username(log.getUsername())
                .module(log.getModule())
                .action(log.getAction())
                .targetId(log.getTargetId())
                .ip(log.getIp())
                .durationMs(log.getDurationMs())
                .success(log.getSuccess())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
