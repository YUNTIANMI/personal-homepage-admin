package com.luoji.blog.common;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

import java.util.List;
import java.util.function.Function;

/**
 * 统一分页响应体。
 *
 * <p>分页由服务端完成（MyBatis-Plus 分页插件），前端只传页码与每页条数，
 * 不再一次性拉取全量数据后在浏览器里计算。
 *
 * <p><b>为什么需要 {@link JsonCreator}</b>：本类是不可变对象（{@code final} 字段 + 私有构造器），
 * Jackson 默认无法反序列化——这会导致 Spring Cache 把本类写入 Redis 后，下次读取时抛
 * {@code missingInstantiator} 使应用崩溃。标注 {@link JsonCreator} 后，Jackson 会通过该构造器
 * 还原对象，缓存因此可安全序列化往返。
 */
@Getter
@Schema(description = "分页响应体")
public class PageResult<T> {

    @Schema(description = "总记录数", example = "128")
    private final long total;

    @Schema(description = "当前页码，从 1 开始", example = "1")
    private final long page;

    @Schema(description = "每页条数", example = "10")
    private final long size;

    @Schema(description = "总页数", example = "13")
    private final long pages;

    @Schema(description = "当前页数据")
    private final List<T> records;

    @JsonCreator
    public PageResult(@JsonProperty("total") long total,
                      @JsonProperty("page") long page,
                      @JsonProperty("size") long size,
                      @JsonProperty("pages") long pages,
                      @JsonProperty("records") List<T> records) {
        this.total = total;
        this.page = page;
        this.size = size;
        this.pages = pages;
        this.records = records;
    }

    /** 由 MyBatis-Plus 分页对象直接转换（实体即出参时使用） */
    public static <T> PageResult<T> of(IPage<T> page) {
        return new PageResult<>(page.getTotal(), page.getCurrent(), page.getSize(), page.getPages(),
                page.getRecords());
    }

    /**
     * 由分页对象转换，并把实体映射为 VO。
     *
     * <p>接口一律返回 VO 而非实体，避免把 {@code deleted} 等内部字段暴露出去。
     */
    public static <E, T> PageResult<T> of(IPage<E> page, Function<E, T> mapper) {
        List<T> records = page.getRecords().stream().map(mapper).toList();
        return new PageResult<>(page.getTotal(), page.getCurrent(), page.getSize(), page.getPages(),
                records);
    }
}
