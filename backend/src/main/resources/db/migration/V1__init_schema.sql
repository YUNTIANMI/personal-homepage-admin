-- =============================================================================
-- V1 · 初始化表结构（12 张表）
-- 引擎 InnoDB / 字符集 utf8mb4（完整中文与 emoji）
--
-- 设计说明：
--   1) 全部业务表使用「逻辑删除」（deleted 列），因此不建物理外键：
--      外键无法表达「引用一条已逻辑删除的记录」，且会在批量写时增加锁竞争；
--      关联完整性由 Service 层与唯一索引共同保证。
--   2) 所有查询都带 deleted = 0，故复合索引一律以 deleted 打头（最左前缀）。
-- =============================================================================

-- ======================== 1. 账号与权限 ========================

CREATE TABLE sys_user (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    username      VARCHAR(50)  NOT NULL COMMENT '登录名，唯一',
    password      VARCHAR(100) NOT NULL COMMENT 'BCrypt 哈希，绝不存明文',
    nickname      VARCHAR(50)  NOT NULL DEFAULT '',
    email         VARCHAR(100) NOT NULL DEFAULT '',
    status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1 启用 / 0 禁用',
    fail_count    INT          NOT NULL DEFAULT 0 COMMENT '连续登录失败次数',
    locked_until  DATETIME     NULL COMMENT '锁定截止时间',
    token_version INT          NOT NULL DEFAULT 0 COMMENT '自增即吊销该用户全部 token',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted       TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '管理员/编辑账号';

CREATE TABLE sys_role (
    id   BIGINT      NOT NULL AUTO_INCREMENT,
    code VARCHAR(30) NOT NULL COMMENT 'ADMIN / EDITOR',
    name VARCHAR(50) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '角色字典';

CREATE TABLE sys_user_role (
    id      BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_role (user_id, role_id),
    KEY idx_role (role_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '用户-角色关联（多对多）';

-- ======================== 2. 文章与标签 ========================

CREATE TABLE post (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    title        VARCHAR(100) NOT NULL,
    post_date    DATE         NOT NULL COMMENT '展示日期（对应前端 date 字段）',
    category     VARCHAR(50)  NOT NULL DEFAULT '' COMMENT '分类保留字符串，不建分类表，避免前端改造',
    summary      VARCHAR(300) NOT NULL DEFAULT '',
    content      MEDIUMTEXT   NOT NULL COMMENT 'Markdown 正文',
    status       VARCHAR(20)  NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT / PUBLISHED / ARCHIVED',
    is_top       TINYINT      NOT NULL DEFAULT 0 COMMENT '置顶：1 是 / 0 否',
    sort         INT          NOT NULL DEFAULT 0 COMMENT '同组内排序权重，越大越靠前',
    view_count   INT          NOT NULL DEFAULT 0,
    version      INT          NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    published_at DATETIME     NULL,
    author_id    BIGINT       NULL COMMENT '作者（sys_user.id）',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted      TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_list    (deleted, status, is_top DESC, sort DESC, post_date DESC),
    KEY idx_updated (deleted, updated_at DESC),
    KEY idx_pubdate (deleted, status, published_at DESC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '文章';

CREATE TABLE tag (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    name       VARCHAR(50) NOT NULL,
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted    TINYINT     NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_name (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '标签';

CREATE TABLE post_tag (
    id      BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    tag_id  BIGINT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_post_tag (post_id, tag_id),
    KEY idx_tag (tag_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '文章-标签关联（多对多）';

CREATE TABLE post_revision (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    post_id    BIGINT       NOT NULL,
    version    INT          NOT NULL COMMENT '对应发布时的文章版本号',
    title      VARCHAR(100) NOT NULL,
    summary    VARCHAR(300) NOT NULL DEFAULT '',
    content    MEDIUMTEXT   NOT NULL,
    editor_id  BIGINT       NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_post_version (post_id, version),
    KEY idx_post (post_id, version DESC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '文章历史版本快照';

-- ======================== 3. 项目 ========================

CREATE TABLE project (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(80)  NOT NULL,
    tagline    VARCHAR(200) NOT NULL DEFAULT '',
    tech       JSON         NULL COMMENT 'string[]，刻意不做关联表',
    links      JSON         NULL COMMENT '[{id,label,href}]，刻意不做关联表',
    is_top     TINYINT      NOT NULL DEFAULT 0,
    sort       INT          NOT NULL DEFAULT 0,
    version    INT          NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted    TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_list (deleted, is_top DESC, sort DESC, name),
    KEY idx_name (deleted, name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '软件项目';

-- ======================== 4. 媒体 ========================

CREATE TABLE media_asset (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    filename    VARCHAR(200) NOT NULL COMMENT '原始文件名',
    path        VARCHAR(300) NOT NULL COMMENT '相对路径 yyyy/MM/uuid.ext',
    url         VARCHAR(500) NOT NULL COMMENT '对外可访问地址',
    size        BIGINT       NOT NULL,
    mime        VARCHAR(80)  NOT NULL,
    uploader_id BIGINT       NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted     TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_created (deleted, created_at DESC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '媒体文件';

-- ======================== 5. 站点配置（单行） ========================

CREATE TABLE site_config (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(50)  NOT NULL DEFAULT '',
    en         VARCHAR(50)  NOT NULL DEFAULT '',
    role       VARCHAR(80)  NOT NULL DEFAULT '',
    headline   VARCHAR(120) NOT NULL DEFAULT '',
    intro      VARCHAR(500) NOT NULL DEFAULT '',
    github     VARCHAR(200) NOT NULL DEFAULT '',
    email      VARCHAR(100) NOT NULL DEFAULT '',
    tech       JSON         NULL COMMENT 'string[]',
    start_year INT          NOT NULL DEFAULT 2026,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '站点配置（单行）';

-- ======================== 6. 日志 ========================

CREATE TABLE operation_log (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     BIGINT       NULL,
    username    VARCHAR(50)  NOT NULL DEFAULT '',
    module      VARCHAR(30)  NOT NULL COMMENT 'POST / PROJECT / MEDIA / CONFIG / ACCOUNT',
    action      VARCHAR(30)  NOT NULL COMMENT 'CREATE / UPDATE / DELETE / PUBLISH / IMPORT',
    target_id   BIGINT       NULL,
    detail      JSON         NULL COMMENT '变更摘要',
    ip          VARCHAR(45)  NOT NULL DEFAULT '',
    duration_ms INT          NOT NULL DEFAULT 0,
    success     TINYINT      NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_query (module, created_at DESC),
    KEY idx_user  (user_id, created_at DESC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '操作审计日志';

CREATE TABLE login_log (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    username   VARCHAR(50)  NOT NULL,
    ip         VARCHAR(45)  NOT NULL DEFAULT '',
    user_agent VARCHAR(300) NOT NULL DEFAULT '',
    success    TINYINT      NOT NULL DEFAULT 1,
    message    VARCHAR(200) NOT NULL DEFAULT '',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_username (username, created_at DESC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '登录日志';
