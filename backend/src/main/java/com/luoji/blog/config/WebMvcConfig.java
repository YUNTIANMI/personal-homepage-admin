package com.luoji.blog.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置。
 *
 * <p>当前只有跨域配置：前端开发服务器（Vite，默认 5174）与后端（8080）不同源，
 * 需要显式允许。生产环境由 Nginx 反向代理到同一域名下的 {@code /api}，不存在跨域。
 *
 * <p>说明：阶段二引入 Spring Security 后，需在安全过滤链中同样开启 CORS
 * （{@code http.cors(...)}），否则预检请求会在进入 MVC 之前被拦截。
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
