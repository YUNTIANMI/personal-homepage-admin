-- =============================================================================
-- V2 · 种子数据
-- 内置：2 个角色、2 个账号（ADMIN / EDITOR）、1 行站点配置
--
-- 默认密码（仅用于本地首次初始化，上线后应立即修改）：
--   admin  ->  admin123
--   editor ->  editor123
-- 密码以 BCrypt 哈希存储，明文不落库。
-- =============================================================================

INSERT INTO sys_role (id, code, name) VALUES
    (1, 'ADMIN',  '管理员'),
    (2, 'EDITOR', '编辑');

INSERT INTO sys_user (id, username, password, nickname, email, status, fail_count, locked_until, token_version, created_at, updated_at, deleted) VALUES
    (1, 'admin',
     '$2b$10$W9OOOygo5gzWikTulYLjVuMHCR1HR.km0gZfg1TGGVMfDyQhznyou',
     '罗辑', '1431634649@qq.com', 1, 0, NULL, 0, NOW(), NOW(), 0),
    (2, 'editor',
     '$2b$10$6gRg2G2CwYd4qlDsEHlkWeSiESaG8QEKlJMLw6bEAIe/cGB6EzUm6',
     '编辑', '', 1, 0, NULL, 0, NOW(), NOW(), 0);

INSERT INTO sys_user_role (user_id, role_id) VALUES
    (1, 1),
    (2, 2);

INSERT INTO site_config (id, name, en, role, headline, intro, github, email, tech, start_year, updated_at) VALUES
    (1,
     '罗辑',
     'LUOJI',
     'Software Engineer · 软件工程',
     '写代码，也写文章。',
     '软件工程专业，长期关注 Web 全栈开发与工程化实践。这里是我记录技术思考、沉淀文章与展示软件项目的独立主页。',
     'https://github.com/YUNTIANMI/',
     '1431634649@qq.com',
     JSON_ARRAY('TypeScript', 'React', 'Node.js', 'Python', 'Git', 'Tailwind CSS', '数据结构与算法'),
     2026,
     NOW());
