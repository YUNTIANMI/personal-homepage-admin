package com.luoji.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.luoji.blog.common.BizException;
import com.luoji.blog.common.ErrorCode;
import com.luoji.blog.common.PageResult;
import com.luoji.blog.entity.MediaAsset;
import com.luoji.blog.mapper.MediaAssetMapper;
import com.luoji.blog.service.MediaService;
import com.luoji.blog.service.StorageService;
import com.luoji.blog.vo.MediaVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.Set;

/** 媒体服务实现 */
@Service
@RequiredArgsConstructor
public class MediaServiceImpl implements MediaService {

    private static final long MAX_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES =
            Set.of("image/png", "image/jpeg", "image/webp", "image/gif");

    private final MediaAssetMapper mediaMapper;
    private final StorageService storageService;

    @Override
    public MediaVO upload(MultipartFile file, Long uploaderId) {
        if (file == null || file.isEmpty()) {
            throw new BizException(ErrorCode.PARAM_INVALID, "文件不能为空");
        }
        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new BizException(ErrorCode.FILE_TYPE_NOT_ALLOWED);
        }
        if (file.getSize() > MAX_SIZE) {
            throw new BizException(ErrorCode.FILE_TOO_LARGE);
        }

        String path = storageService.store(file);
        // 用当前请求的上下文拼出绝对地址，存进 url 列，前端可直接引用
        String base = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();

        MediaAsset asset = new MediaAsset();
        asset.setFilename(file.getOriginalFilename());
        asset.setPath(path);
        asset.setUrl(base + "/uploads/" + path);
        asset.setSize(file.getSize());
        asset.setMime(file.getContentType());
        asset.setUploaderId(uploaderId);
        mediaMapper.insert(asset);

        return toVO(asset);
    }

    @Override
    public PageResult<MediaVO> page(long page, long size) {
        Page<MediaAsset> p = mediaMapper.selectPage(
                new Page<>(Math.max(1, page), Math.min(Math.max(1, size), 200)),
                new LambdaQueryWrapper<MediaAsset>().orderByDesc(MediaAsset::getCreatedAt));
        return PageResult.of(p, this::toVO);
    }

    @Override
    public void delete(Long id) {
        MediaAsset asset = mediaMapper.selectById(id);
        if (asset == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        mediaMapper.deleteById(id);
        storageService.delete(asset.getPath());
    }

    private MediaVO toVO(MediaAsset asset) {
        return MediaVO.builder()
                .id(asset.getId())
                .filename(asset.getFilename())
                .path(asset.getPath())
                .url(asset.getUrl())
                .size(asset.getSize())
                .mime(asset.getMime())
                .createdAt(asset.getCreatedAt())
                .build();
    }
}
