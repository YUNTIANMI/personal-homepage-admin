package com.luoji.blog.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.BlockAttackInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.OptimisticLockerInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MyBatis-Plus 插件配置。
 *
 * <p>三个插件在此一次性配好，后续各业务表直接生效，无需逐表处理：
 * <ul>
 *   <li><b>分页插件</b>：阶段三起被所有列表接口使用，把分页下推到 SQL；</li>
 *   <li><b>乐观锁插件</b>：阶段四用于文章并发编辑（{@code @Version}）；</li>
 *   <li><b>防全表更新/删除</b>：漏写 {@code where} 时直接抛异常，避免误伤全表。</li>
 * </ul>
 *
 * <p>官方建议的插件顺序：分页 / 乐观锁 → 防全表更新删除，故按此顺序添加。
 */
@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();

        PaginationInnerInterceptor pagination = new PaginationInnerInterceptor(DbType.MYSQL);
        pagination.setMaxLimit(200L);   // 单页上限，防止 pageSize 被恶意放大
        pagination.setOverflow(false);  // 页码超出总页数时返回空列表，而不是回到首页
        interceptor.addInnerInterceptor(pagination);

        interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());

        interceptor.addInnerInterceptor(new BlockAttackInnerInterceptor());

        return interceptor;
    }
}
