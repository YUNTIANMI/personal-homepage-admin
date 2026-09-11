-- =============================================================================
-- V3 · 统一 BaseEntity 结构：tag 表补充 updated_at 列
--
-- 背景：Tag 实体继承 BaseEntity（created_at / updated_at / deleted），
-- 但 V1 建表时 tag 漏了 updated_at，导致查询报「Unknown column 'updated_at'」。
-- 通过 Flyway 版本化迁移补齐，体现「表结构变更随代码走、可追溯、可重放」。
-- =============================================================================
ALTER TABLE tag
    ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
