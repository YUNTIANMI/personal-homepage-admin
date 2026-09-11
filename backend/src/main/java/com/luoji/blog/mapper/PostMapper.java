package com.luoji.blog.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.luoji.blog.entity.Post;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

/** 文章 Mapper */
public interface PostMapper extends BaseMapper<Post> {

    /**
     * 回收站分页查询（已逻辑删除的文章）。
     *
     * <p>MyBatis-Plus 的 {@code @TableLogic} 会把普通查询自动追加 {@code deleted = 0}，
     * 无法直接查出「已删除」数据，因此这里用原生 SQL 显式查 {@code deleted = 1}，
     * 并绕开逻辑删除拦截。分页由分页插件对入参 {@link Page} 生效。
     */
    @Select("<script>" +
            "SELECT * FROM post WHERE deleted = 1 " +
            "<if test='keyword != null and keyword != \"\"'>" +
            "  AND (title LIKE CONCAT('%', #{keyword}, '%') OR summary LIKE CONCAT('%', #{keyword}, '%'))" +
            "</if>" +
            " ORDER BY updated_at DESC" +
            "</script>")
    Page<Post> selectTrashPage(Page<Post> page, @Param("keyword") String keyword);

    /** 从回收站恢复：把逻辑删除标记置回 0 */
    @Update("UPDATE post SET deleted = 0, updated_at = NOW() WHERE id = #{id} AND deleted = 1")
    int restoreById(@Param("id") Long id);

    /** 浏览量批量累加（定时任务落库用） */
    @Update("UPDATE post SET view_count = view_count + #{count} WHERE id = #{id}")
    int incrementViewCount(@Param("id") Long id, @Param("count") long count);
}
