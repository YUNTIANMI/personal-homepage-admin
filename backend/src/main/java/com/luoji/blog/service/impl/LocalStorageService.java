package com.luoji.blog.service.impl;

import com.luoji.blog.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 本地磁盘存储实现。
 *
 * <p>文件落在 {@code storage.local-dir}（默认 uploads，已 gitignore），
 * 路径按 {@code yyyy/MM/uuid.ext} 归档，避免同名覆盖、便于按时间管理。
 */
@Service
public class LocalStorageService implements StorageService {

    private final Path rootDir;

    public LocalStorageService(@Value("${storage.local-dir:uploads}") String localDir) {
        this.rootDir = Paths.get(localDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(rootDir);
        } catch (IOException e) {
            throw new IllegalStateException("无法创建上传目录：" + rootDir, e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        String original = StringUtils.hasText(file.getOriginalFilename())
                ? file.getOriginalFilename() : "file";
        String ext = extOf(original, file.getContentType());

        LocalDate now = LocalDate.now();
        String dir = String.format("%d/%02d", now.getYear(), now.getMonthValue());
        String relativePath = dir + "/" + UUID.randomUUID() + "." + ext;

        Path target = rootDir.resolve(relativePath).normalize();
        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target);
        } catch (IOException e) {
            throw new IllegalStateException("文件保存失败", e);
        }
        return relativePath;
    }

    @Override
    public void delete(String path) {
        if (!StringUtils.hasText(path)) {
            return;
        }
        try {
            Files.deleteIfExists(rootDir.resolve(path).normalize());
        } catch (IOException ignored) {
            // 删除失败不影响主流程（记录缺失但文件残留，可后续清理）
        }
    }

    private String extOf(String filename, String contentType) {
        String fromName = filename.contains(".")
                ? filename.substring(filename.lastIndexOf('.') + 1).toLowerCase() : "";
        if (fromName.matches("[a-z0-9]{2,5}")) {
            return fromName;
        }
        if ("image/jpeg".equals(contentType)) {
            return "jpg";
        }
        if ("image/png".equals(contentType)) {
            return "png";
        }
        if ("image/webp".equals(contentType)) {
            return "webp";
        }
        if ("image/gif".equals(contentType)) {
            return "gif";
        }
        return "bin";
    }
}
