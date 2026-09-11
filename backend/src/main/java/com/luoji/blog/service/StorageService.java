package com.luoji.blog.service;

import org.springframework.web.multipart.MultipartFile;

/**
 * 文件存储抽象。
 *
 * <p>阶段三用本地磁盘实现（{@code LocalStorageService}），
 * 通过接口隔离，日后替换为对象存储（OSS / S3 / MinIO）只需新增一个实现类。
 */
public interface StorageService {

    /** 保存文件，返回相对路径（yyyy/MM/uuid.ext） */
    String store(MultipartFile file);

    /** 删除物理文件（不存在则忽略） */
    void delete(String path);
}
