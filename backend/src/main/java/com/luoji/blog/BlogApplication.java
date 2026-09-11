package com.luoji.blog;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 罗辑个人主页 · 后端服务启动类。
 *
 * <p>单体分层架构：Controller（收参）/ Service（业务）/ Mapper（数据访问）。
 * 本类不做任何业务配置，配置统一放在 {@code config} 包。
 */
@SpringBootApplication
@MapperScan("com.luoji.blog.mapper")
public class BlogApplication {

    public static void main(String[] args) {
        SpringApplication.run(BlogApplication.class, args);
    }
}
