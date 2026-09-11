package com.luoji.blog.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * MVC 配置。
 *
 * <p>把本地上传目录映射为 {@code /uploads/**} 静态资源，供前端直接引用图片。
 * 跨域已迁移到 Spring Security 过滤链（见 SecurityConfig）。
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${storage.local-dir:uploads}")
    private String localDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + Paths.get(localDir).toAbsolutePath().normalize() + "/";
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }
}
