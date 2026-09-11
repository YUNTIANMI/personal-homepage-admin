package com.luoji.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.luoji.blog.common.BizException;
import com.luoji.blog.common.ErrorCode;
import com.luoji.blog.common.PageResult;
import com.luoji.blog.dto.PostQueryDTO;
import com.luoji.blog.dto.PostSaveDTO;
import com.luoji.blog.entity.Post;
import com.luoji.blog.entity.PostTag;
import com.luoji.blog.entity.Tag;
import com.luoji.blog.mapper.PostMapper;
import com.luoji.blog.mapper.PostTagMapper;
import com.luoji.blog.mapper.TagMapper;
import com.luoji.blog.service.PostService;
import com.luoji.blog.vo.PostVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 文章服务实现。
 *
 * <p>标签多对多：保存时按名「查或建」标签并重建关联；查询时按当前页文章 id 批量取回，
 * 固定次数查询（不产生 N+1），然后聚合回 {@code string[]} 返回给前端。
 */
@Service
@RequiredArgsConstructor
public class PostServiceImpl implements PostService {

    /** 阶段三新建文章统一发布；状态机在阶段四引入 */
    private static final String DEFAULT_STATUS = "PUBLISHED";

    private final PostMapper postMapper;
    private final TagMapper tagMapper;
    private final PostTagMapper postTagMapper;

    @Override
    public PageResult<PostVO> page(PostQueryDTO query) {
        long pageNo = Math.max(1, query.getPage());
        long size = Math.min(Math.max(1, query.getSize()), 200);

        LambdaQueryWrapper<Post> qw = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.getKeyword())) {
            String kw = query.getKeyword().trim();
            qw.and(w -> w.like(Post::getTitle, kw)
                    .or().like(Post::getSummary, kw)
                    .or().like(Post::getContent, kw));
        }
        applySort(qw, query);

        Page<Post> page = postMapper.selectPage(new Page<>(pageNo, size), qw);

        List<Post> records = page.getRecords();
        Map<Long, List<String>> tagsByPost = records.isEmpty()
                ? Map.of()
                : loadTagsByPost(records.stream().map(Post::getId).toList());

        return PageResult.of(page, post -> toVO(post, tagsByPost.getOrDefault(post.getId(), List.of())));
    }

    @Override
    public PostVO get(Long id) {
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        List<String> tags = loadTagsByPost(List.of(id)).getOrDefault(id, List.of());
        return toVO(post, tags);
    }

    @Override
    public Long create(PostSaveDTO dto, Long authorId) {
        Post post = new Post();
        applyDraft(post, dto);
        post.setStatus(DEFAULT_STATUS);
        post.setIsTop(0);
        post.setSort(0);
        post.setViewCount(0);
        post.setAuthorId(authorId);
        postMapper.insert(post);

        saveTags(post.getId(), dto.getTags());
        return post.getId();
    }

    @Override
    public void update(Long id, PostSaveDTO dto) {
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        applyDraft(post, dto);
        postMapper.updateById(post);

        saveTags(id, dto.getTags());
    }

    @Override
    public void delete(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        // 逻辑删除：MyBatis-Plus 的 @TableLogic 自动把 DELETE 改写为 UPDATE deleted=1
        postMapper.deleteBatchIds(ids);
    }

    @Override
    public List<String> listTags() {
        return tagMapper.selectList(new LambdaQueryWrapper<Tag>()
                        .isNotNull(Tag::getName)
                        .orderByAsc(Tag::getName))
                .stream()
                .map(Tag::getName)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    /* ---------------- 内部方法 ---------------- */

    private void applyDraft(Post post, PostSaveDTO dto) {
        post.setTitle(dto.getTitle().trim());
        post.setPostDate(dto.getDate());
        post.setCategory(dto.getCategory() == null ? "" : dto.getCategory().trim());
        post.setSummary(dto.getSummary() == null ? "" : dto.getSummary().trim());
        post.setContent(dto.getContent());
    }

    private void applySort(LambdaQueryWrapper<Post> qw, PostQueryDTO query) {
        boolean asc = "asc".equalsIgnoreCase(query.getOrder());
        String sortBy = query.getSortBy() == null ? "" : query.getSortBy();
        switch (sortBy) {
            case "date" -> qw.orderBy(true, asc, Post::getPostDate);
            case "title" -> qw.orderBy(true, asc, Post::getTitle);
            case "updated" -> qw.orderBy(true, asc, Post::getUpdatedAt);
            default -> qw.orderByDesc(Post::getUpdatedAt);
        }
    }

    /** 保存标签：清理旧关联 → 按名查或建标签 → 重建关联 */
    private void saveTags(Long postId, List<String> tags) {
        postTagMapper.delete(new LambdaQueryWrapper<PostTag>().eq(PostTag::getPostId, postId));

        Set<String> names = new LinkedHashSet<>();
        if (tags != null) {
            tags.stream().map(String::trim).filter(StringUtils::hasText).forEach(names::add);
        }
        for (String name : names) {
            Tag tag = tagMapper.selectOne(new LambdaQueryWrapper<Tag>().eq(Tag::getName, name));
            if (tag == null) {
                tag = new Tag();
                tag.setName(name);
                tagMapper.insert(tag);
            }
            PostTag pt = new PostTag();
            pt.setPostId(postId);
            pt.setTagId(tag.getId());
            postTagMapper.insert(pt);
        }
    }

    /** 批量取回一批文章的标签，聚合为 postId -> 标签名列表（固定次数查询） */
    private Map<Long, List<String>> loadTagsByPost(List<Long> postIds) {
        List<PostTag> relations = postTagMapper.selectList(
                new LambdaQueryWrapper<PostTag>().in(PostTag::getPostId, postIds));

        Set<Long> tagIds = relations.stream().map(PostTag::getTagId).collect(Collectors.toSet());
        Map<Long, String> tagNames = tagIds.isEmpty()
                ? Map.of()
                : tagMapper.selectBatchIds(tagIds).stream()
                        .collect(Collectors.toMap(Tag::getId, Tag::getName));

        return relations.stream().collect(Collectors.groupingBy(
                PostTag::getPostId,
                Collectors.mapping(pt -> tagNames.get(pt.getTagId()),
                        Collectors.filtering(Objects::nonNull, Collectors.toList()))));
    }

    private PostVO toVO(Post post, List<String> tags) {
        return PostVO.builder()
                .id(post.getId())
                .title(post.getTitle())
                .date(post.getPostDate() == null ? null : post.getPostDate().toString())
                .category(post.getCategory())
                .tags(tags)
                .description(post.getSummary())
                .content(post.getContent())
                .status(post.getStatus())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }
}
