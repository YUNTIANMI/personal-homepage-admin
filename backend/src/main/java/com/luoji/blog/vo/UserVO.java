package com.luoji.blog.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 用户信息出参。
 *
 * <p>注意：**不含密码、状态、失败计数、令牌版本号**等敏感/内部字段。
 * 实体与 VO 分离的意义就在于此——表结构怎么变，都不影响对外契约。
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVO {

    @Schema(example = "1")
    private Long id;

    @Schema(example = "admin")
    private String username;

    @Schema(example = "罗辑")
    private String nickname;

    @Schema(example = "1431634649@qq.com")
    private String email;

    @Schema(description = "角色编码集合", example = "[\"ADMIN\"]")
    private List<String> roles;
}
