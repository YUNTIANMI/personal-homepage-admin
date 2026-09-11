-- =============================================================================
-- V4 · 统一 BaseEntity 结构：media_asset 表补充 updated_at 列
-- 与 V3 同理：MediaAsset 实体继承 BaseEntity，补齐遗漏的时间戳列。
-- =============================================================================
ALTER TABLE media_asset
    ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
