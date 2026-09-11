package com.luoji.blog.task;

import com.luoji.blog.mapper.PostMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * 浏览量定时落库任务（阶段五）。
 *
 * <p>阅读时只做 Redis 自增（{@code post:view:{id}}），本任务每 5 分钟扫描一次这些 key，
 * 把增量累加到 {@code post.view_count} 后删除 key，避免每次阅读都直接写数据库。
 *
 * <p>这是「用 Redis 缓冲高频写、定时批量回写数据库」的典型应用，
 * 代价是浏览量最多延迟 5 分钟可见，对个人站点完全可接受。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ViewCountTask {

    private static final String VIEW_KEY_PREFIX = "post:view:";

    private final StringRedisTemplate redisTemplate;
    private final PostMapper postMapper;

    @Scheduled(fixedDelay = 5 * 60 * 1000, initialDelay = 60 * 1000)
    public void flushViewCounts() {
        Set<String> keys = redisTemplate.keys(VIEW_KEY_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return;
        }
        for (String key : keys) {
            String value = redisTemplate.opsForValue().get(key);
            if (value == null) {
                redisTemplate.delete(key);
                continue;
            }
            redisTemplate.delete(key);
            try {
                long id = Long.parseLong(key.substring(VIEW_KEY_PREFIX.length()));
                long count = Long.parseLong(value);
                postMapper.incrementViewCount(id, count);
            } catch (Exception e) {
                log.warn("[浏览量] 落库失败 key={}：{}", key, e.getMessage());
            }
        }
    }
}
