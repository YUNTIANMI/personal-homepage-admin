package com.luoji.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.luoji.blog.common.BizException;
import com.luoji.blog.common.ErrorCode;
import com.luoji.blog.common.PageResult;
import com.luoji.blog.common.enums.PostStatus;
import com.luoji.blog.dto.PostQueryDTO;
import com.luoji.blog.dto.PostSaveDTO;
import com.luoji.blog.dto.PostStatusDTO;
import com.luoji.blog.dto.PostTopDTO;
import com.luoji.blog.entity.Post;
import com.luoji.blog.entity.PostRevision;
import com.luoji.blog.entity.PostTag;
import com.luoji.blog.entity.Tag;
import com.luoji.blog.mapper.PostMapper;
import com.luoji.blog.mapper.PostRevisionMapper;
import com.luoji.blog.mapper.PostTagMapper;
import com.luoji.blog.mapper.TagMapper;
import com.luoji.blog.service.PostService;
import com.luoji.blog.vo.PostRevisionVO;
import com.luoji.blog.vo.PostVO;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 文章服务实现。
 *
 * <p>阶段四引入的核心机制：
 * <ul>
 *   <li><b>状态机</b>：合法流转边集中在 {@link PostStatus}，非法流转抛 {@code STATE_ILLEGAL}；</li>
 *   <li><b>乐观锁</b>：{@code @Version} 字段 + 客户端带回 version，冲突返回 409；</li>
 *   <li><b>事务</b>：发布时在同一事务内更新状态 + 写入历史版本快照，任一失败整体回滚；</li>
 *   <li><b>历史版本</b>：每次发布留快照，支持查看与回滚（回滚本身也生成新快照）；</li>
 *   <li><b>回收站</b>：逻辑删除后可在回收站恢复。</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class PostServiceImpl implements PostService {

    private static final String VIEW_KEY_PREFIX = "post:view:";

    private final PostMapper postMapper;
    private final TagMapper tagMapper;
    private final PostTagMapper postTagMapper;
    private final PostRevisionMapper postRevisionMapper;
    private final StringRedisTemplate redisTemplate;

    @Override
    @Cacheable(cacheNames = "post:list",
            key = "#query.page + ':' + #query.size + ':' + #query.keyword + ':' + #query.status + ':' + #query.sortBy + ':' + #query.order")
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
        if (StringUtils.hasText(query.getStatus())) {
            qw.eq(Post::getStatus, query.getStatus().trim().toUpperCase());
        }
        applySort(qw, query);

        Page<Post> page = postMapper.selectPage(new Page<>(pageNo, size), qw);
        return toPageResult(page);
    }

    @Override
    @Cacheable(cacheNames = "post:detail", key = "#id")
    public PostVO get(Long id) {
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        List<String> tags = loadTagsByPost(List.of(id)).getOrDefault(id, List.of());
        return toVO(post, tags);
    }

    @Override
    public void recordView(Long id) {
        // 阅读时只做 Redis 自增，由 ViewCountTask 定时批量落库，避免每次阅读都写数据库
        redisTemplate.opsForValue().increment(VIEW_KEY_PREFIX + id);
    }

    @Override
    @CacheEvict(cacheNames = {"post:detail", "post:list"}, allEntries = true)
    public Long create(PostSaveDTO dto, Long authorId) {
        Post post = new Post();
        applyDraft(post, dto);
        post.setStatus(PostStatus.DRAFT.name());
        post.setIsTop(0);
        post.setSort(0);
        post.setViewCount(0);
        post.setVersion(0);
        post.setAuthorId(authorId);
        postMapper.insert(post);

        saveTags(post.getId(), dto.getTags());
        return post.getId();
    }

    @Override
    @CacheEvict(cacheNames = {"post:detail", "post:list"}, allEntries = true)
    public void update(Long id, PostSaveDTO dto) {
        if (dto.getVersion() == null) {
            throw new BizException(ErrorCode.PARAM_INVALID, "编辑需要携带版本号（version）");
        }
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        applyDraft(post, dto);
        // 乐观锁：用客户端带回的版本号作为更新条件，并发修改时影响行数为 0
        post.setVersion(dto.getVersion());
        int rows = postMapper.updateById(post);
        if (rows == 0) {
            throw new BizException(ErrorCode.VERSION_CONFLICT);
        }
        saveTags(id, dto.getTags());
    }

    @Override
    @CacheEvict(cacheNames = {"post:detail", "post:list"}, allEntries = true)
    public void delete(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        // 逻辑删除：@TableLogic 自动把 DELETE 改写为 UPDATE deleted=1（进回收站）
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

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(cacheNames = {"post:detail", "post:list"}, allEntries = true)
    public void changeStatus(Long id, PostStatusDTO dto, Long editorId) {
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }

        PostStatus from = PostStatus.of(post.getStatus());
        PostStatus to = PostStatus.of(dto.getStatus());
        // 状态机：非法流转（如 已归档 → 已发布）直接拒绝
        PostStatus.checkTransition(from, to);

        // 乐观锁 + 状态落地
        post.setStatus(to.name());
        post.setVersion(dto.getVersion());
        if (to == PostStatus.PUBLISHED) {
            post.setPublishedAt(LocalDateTime.now());
        }
        int rows = postMapper.updateById(post);
        if (rows == 0) {
            throw new BizException(ErrorCode.VERSION_CONFLICT);
        }

        // 发布：在同一事务内留存历史版本快照（跨 post / post_revision 两张表写入）
        if (to == PostStatus.PUBLISHED) {
            saveSnapshot(post, editorId, dto.getVersion() + 1);
        }
    }

    @Override
    @CacheEvict(cacheNames = {"post:detail", "post:list"}, allEntries = true)
    public void toggleTop(Long id, PostTopDTO dto) {
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        if (dto.getIsTop() != null) {
            post.setIsTop(dto.getIsTop() == 1 ? 1 : 0);
        }
        if (dto.getSort() != null) {
            post.setSort(dto.getSort());
        }
        postMapper.updateById(post);
    }

    @Override
    public PageResult<PostVO> trashPage(PostQueryDTO query) {
        long pageNo = Math.max(1, query.getPage());
        long size = Math.min(Math.max(1, query.getSize()), 200);
        String keyword = StringUtils.hasText(query.getKeyword()) ? query.getKeyword().trim() : null;

        Page<Post> page = postMapper.selectTrashPage(new Page<>(pageNo, size), keyword);
        return toPageResult(page);
    }

    @Override
    @CacheEvict(cacheNames = {"post:detail", "post:list"}, allEntries = true)
    public void restore(Long id) {
        int rows = postMapper.restoreById(id);
        if (rows == 0) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
    }

    @Override
    public List<PostRevisionVO> listRevisions(Long id) {
        if (postMapper.selectById(id) == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        return postRevisionMapper.selectList(new LambdaQueryWrapper<PostRevision>()
                        .eq(PostRevision::getPostId, id)
                        .orderByDesc(PostRevision::getVersion))
                .stream()
                .map(this::toRevisionVO)
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(cacheNames = {"post:detail", "post:list"}, allEntries = true)
    public PostVO rollback(Long id, Integer version, Long editorId) {
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        PostRevision revision = postRevisionMapper.selectOne(new LambdaQueryWrapper<PostRevision>()
                .eq(PostRevision::getPostId, id)
                .eq(PostRevision::getVersion, version));
        if (revision == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "历史版本不存在");
        }

        // 用快照覆盖当前内容（乐观锁自动 +1，并发修改时影响行数为 0）
        post.setTitle(revision.getTitle());
        post.setSummary(revision.getSummary());
        post.setContent(revision.getContent());
        int rows = postMapper.updateById(post);
        if (rows == 0) {
            throw new BizException(ErrorCode.VERSION_CONFLICT);
        }

        // 回滚本身也生成一个新快照，记录「内容被回滚到版本 X」
        int nextVersion = (post.getVersion() == null ? 0 : post.getVersion()) + 1;
        saveSnapshot(post, editorId, nextVersion);

        return get(id);
    }

    /* ---------------- 内部方法 ---------------- */

    private PageResult<PostVO> toPageResult(Page<Post> page) {
        List<Post> records = page.getRecords();
        Map<Long, List<String>> tagsByPost = records.isEmpty()
                ? Map.of()
                : loadTagsByPost(records.stream().map(Post::getId).toList());
        return PageResult.of(page, post -> toVO(post, tagsByPost.getOrDefault(post.getId(), List.of())));
    }

    private void applyDraft(Post post, PostSaveDTO dto) {
        post.setTitle(dto.getTitle().trim());
        post.setPostDate(dto.getDate());
        post.setCategory(dto.getCategory() == null ? "" : dto.getCategory().trim());
        post.setSummary(dto.getSummary() == null ? "" : dto.getSummary().trim());
        post.setContent(dto.getContent());
    }

    private void applySort(LambdaQueryWrapper<Post> qw, PostQueryDTO query) {
        // 置顶优先 + 权重，再按指定字段排序
        qw.orderByDesc(Post::getIsTop).orderByDesc(Post::getSort);

        boolean asc = "asc".equalsIgnoreCase(query.getOrder());
        String sortBy = query.getSortBy() == null ? "" : query.getSortBy();
        switch (sortBy) {
            case "date" -> qw.orderBy(true, asc, Post::getPostDate);
            case "title" -> qw.orderBy(true, asc, Post::getTitle);
            default -> qw.orderBy(true, asc, Post::getUpdatedAt);
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

    /** 留存历史版本快照（发布 / 回滚时调用，须在事务内） */
    private void saveSnapshot(Post post, Long editorId, int version) {
        PostRevision revision = new PostRevision();
        revision.setPostId(post.getId());
        revision.setVersion(version);
        revision.setTitle(post.getTitle());
        revision.setSummary(post.getSummary());
        revision.setContent(post.getContent());
        revision.setEditorId(editorId);
        revision.setCreatedAt(LocalDateTime.now());
        postRevisionMapper.insert(revision);
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
                .version(post.getVersion())
                .isTop(post.getIsTop())
                .sort(post.getSort())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    private PostRevisionVO toRevisionVO(PostRevision revision) {
        return PostRevisionVO.builder()
                .version(revision.getVersion())
                .title(revision.getTitle())
                .summary(revision.getSummary())
                .content(revision.getContent())
                .createdAt(revision.getCreatedAt())
                .build();
    }
}
