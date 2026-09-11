package com.luoji.blog.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * 文章列表查询入参（由查询参数绑定，均有默认值）。
 *
 * <p>排序字段：{@code date}（日期）/ {@code updated}（更新时间）/ {@code title}（标题）；
 * 排序方向：{@code asc} / {@code desc}。
 */
@Getter
@Setter
public class PostQueryDTO {

    private long page = 1;

    private long size = 10;

    private String keyword;

    private String sortBy = "updated";

    private String order = "desc";
}
