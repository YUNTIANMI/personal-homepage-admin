package com.luoji.blog.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 接口文档配置（springdoc-openapi）。
 *
 * <p>启动后访问 {@code /swagger-ui.html} 即可看到全部接口并发起调试，
 * 后端不必再手写接口文档。
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI luojiBlogOpenApi() {
        return new OpenAPI().info(new Info()
                .title("罗辑个人主页 · 后端 API")
                .version("0.1.0")
                .description("""
                        单体分层架构（Controller / Service / Mapper）。

                        统一响应格式：`{ "code": 0, "message": "成功", "data": ... }`；
                        `code` 非 0 时为业务错误码，HTTP 状态码与其保持一致。
                        """)
                .contact(new Contact().name("罗辑"))
                .license(new License().name("Private")));
    }
}
