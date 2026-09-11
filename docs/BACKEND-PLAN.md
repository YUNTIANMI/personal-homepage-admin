# luoji-blog · 后端改造开发计划

| 项 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 撰写日期 | 2026-09-11 |
| 目标 | 把现有「前端 + Supabase」项目改造成「前端 + 自研 Spring Boot 后端」，用最小规模覆盖常规后端模块与流程 |
| 关联文档 | [`BACKEND-REQUIREMENTS.md`](./BACKEND-REQUIREMENTS.md)（需求）· [`BACKEND-ARCHITECTURE.md`](./BACKEND-ARCHITECTURE.md)（架构） |
| 计划性质 | 单人项目，按**里程碑**推进；每阶段必须能独立演示，不允许「全部做完才可见」 |

---

## 0. 开工前的技能预检

> 先花半天到一天确认这些能看懂，避免中途卡死。若某项完全陌生，先补它。

| 主题 | 必须掌握的 |
| --- | --- |
| Spring Boot | `@RestController` / `@Service` / `@Autowired`、`application.yml` 配置、启动类 |
| MyBatis-Plus | `BaseMapper`、`LambdaQueryWrapper`、分页插件 |
| Spring Security | 过滤链 `SecurityFilterChain`、`SecurityContextHolder`、`@PreAuthorize` |
| JWT | 三段结构、签名校验、`exp` 过期、无状态的含义 |
| MySQL | 建表、索引最左前缀、`EXPLAIN` 会看 `type` 与 `key` |
| Redis | `String` 结构、`INCR`/`EXPIRE`、Spring Cache 注解 |
| Maven | `pom.xml` 依赖、`mvn spring-boot:run` / `mvn test` |

---

## 1. 里程碑总览

| 里程碑 | 主题 | 工期 | 核心产出 | 能否独立演示 |
| --- | --- | --- | --- | --- |
| **M0** | 骨架与规范 | 1～2 天 | 项目结构、统一响应体、全局异常、Flyway、Swagger、Docker Compose | ✅ Swagger 打开 |
| **M1** | 数据模型与认证 | 4～5 天 | 12 张表、JWT 双 token、黑名单、登录风控 | ✅ 登录 → 访问受保护接口 |
| **M2** | 文章 CRUD 与分页下沉 | 5～6 天 | 文章/标签多对多、服务端分页排序搜索、DTO/VO 分层 | ✅ 前端文章模块可用 |
| **M3** | **业务深度（核心）** | 5～6 天 | 状态机、跨表事务、历史版本、乐观锁、回收站、AOP 审计 | ✅ 并发冲突 409、事务回滚 |
| **M4** | 其余模块与缓存 | 4～5 天 | 项目/媒体/配置/仪表盘/导入导出 + Redis 缓存 | ✅ 前端全量回归通过 |
| **M5** | 工程化与部署 | 3～4 天 | 测试、CI、镜像、线上 HTTPS 部署 | ✅ 一条命令起全栈 |
| **M6** | 交付与答辩 | 2～3 天 | README 重写、数据迁移、演示脚本 | ✅ 5 分钟讲清 |
| | **合计** | **24～31 工作日** | | |

> 全职 ≈ **5～6 周**；每天投入 3 小时 ≈ **10 周**。时间不够时按 §6 砍，**M3 不可砍**。

---

## 2. 里程碑详情

### M0 · 骨架与规范（1～2 天）

**目标**：跑通「一个接口能返回统一格式」，同时把工程规范定死，后续不再返工。

- [ ] `spring initializr` 生成项目：Spring Web / Validation / MySQL Driver / Redis / Lombok
- [ ] `pom.xml` 引入 MyBatis-Plus、Spring Security、jjwt、springdoc-openapi、Flyway
- [ ] 写 `common/`：`Result`、`PageResult`、`ErrorCode`、`BizException`、`GlobalExceptionHandler`
- [ ] `application.yml` 分 dev / prod，敏感项走环境变量
- [ ] `docker-compose.yml` 起 MySQL + Redis；Flyway 接上，能自动建空库
- [ ] 写一个 `GET /api/ping` 验证全链路
- [ ] `OpenApiConfig`，`/swagger-ui.html` 能打开

**验收**：`docker compose up -d` 后启动应用，Swagger 可见 `/api/ping`，返回 `{ code: 0, message: "成功", data: "pong" }`。

---

### M1 · 数据模型与认证（4～5 天）

**目标**：完成全部 DDL 与鉴权闭环，这是所有后续功能的底座。

- [ ] Flyway `V1__init_schema.sql`：**12 张表**全部建好（含索引）
- [ ] `V2__seed_data.sql`：内置 1 个 ADMIN 账号、2 个角色、1 行站点配置
- [ ] entity / mapper 生成（可用 MyBatis-Plus 代码生成器）
- [ ] `MybatisPlusConfig`：分页插件 + 乐观锁插件 + `MetaObjectHandler` 自动填充
- [ ] `PasswordEncoder`（BCrypt）
- [ ] `JwtTokenProvider`：签发 / 解析 / 校验 access 与 refresh
- [ ] `JwtAuthenticationFilter` + `SecurityConfig`：放行 `/api/auth/login`、`/api/auth/refresh`、展示端只读接口
- [ ] `POST /api/auth/login`：失败计数、5 次锁定 15 分钟、写 `login_log`
- [ ] `POST /api/auth/logout`：token 入 Redis 黑名单
- [ ] `PUT /api/auth/password`：校验旧密码 + `token_version` 自增吊销旧 token
- [ ] `@PreAuthorize` 角色注解 + ADMIN/EDITOR 差异验证

**验收**：
1. 错误密码连续 5 次 → 第 6 次返回 `423 ACCOUNT_LOCKED`；
2. 无 token 访问 `/api/posts` → `401`；
3. 登出后立刻用原 token 访问 → `401`（黑名单生效）；
4. `login_log` 中能看到成功与失败记录。

---

### M2 · 文章 CRUD 与分页下沉（5～6 天）

**目标**：把「前端内存里的搜索/排序/分页」搬到 SQL，并把分层与 DTO/VO 规范彻底落实。

- [ ] `PostSaveDTO`（含校验注解）、`PostVO`（字段名与前端类型一致）
- [ ] `PostService` + `PostServiceImpl`：新增 / 编辑 / 详情 / 逻辑删除 / 批量删除
- [ ] **标签多对多**：保存时按名字 `INSERT IGNORE` 建档，重建 `post_tag` 关联；查询时聚合成 `string[]`
- [ ] `GET /api/posts`：分页 + 关键词（标题/摘要/正文）+ 排序（更新时间/日期/标题）+ 排序方向
- [ ] `GET /api/tags`
- [ ] 复杂 SQL 写入 `resources/mapper/PostMapper.xml`（关联查询、标签聚合）
- [ ] 前端：`lib/cloud.ts` → `lib/api.ts`，先只接**文章**相关接口
- [ ] 前端：`store.tsx` 适配分页返回结构

**验收**：
1. 造 1 万条测试数据，`GET /api/posts?page=1&size=10&keyword=xx` 响应 < 200 ms，`EXPLAIN` 命中 `idx_list`；
2. 前端文章列表的搜索、排序、分页、增删改全部正常；
3. Controller 内无 `if` 业务判断。

---

### M3 · 业务深度（5～6 天）★ 面试主战场

**目标**：这三件事决定面试官对你的评价，也是「后端的价值」所在。

- [ ] `PostStatus` 枚举 + **状态机**：集中定义合法流转边，非法流转抛 `STATE_ILLEGAL`
- [ ] `PUT /api/posts/{id}/status`：按状态走不同分支（发布时写 `published_at`）
- [ ] **`@Transactional` 发布流程**：更新 `post` + 插入 `post_revision`，任一失败整体回滚
- [ ] `GET /api/posts/{id}/revisions` + 回滚接口（回滚本身也是一次事务）
- [ ] **乐观锁**：`@Version` + 插件；提交 `version` 不匹配 → `409 VERSION_CONFLICT`
- [ ] **回收站**：逻辑删除 + `GET /api/posts/trash` + 恢复接口
- [ ] `@OperationLog` 注解 + `OperationLogAspect`（`@Around` + `@Async` 写 `operation_log`）
- [ ] 前端：编辑冲突提示、状态切换按钮、回收站页面

**验收**（每条都要能现场演示）：
1. 两个浏览器会话编辑同一篇文章，后提交者收到 **409**，且内容**未被覆盖**；
2. 在发布流程中人为抛异常 → `post` 状态未变、`post_revision` 无新增记录（**事务回滚**）；
3. 删除文章后列表不可见、回收站可见、恢复后回到列表，数据库 `deleted` 字段正确；
4. 每次发布在 `operation_log` 中留下一条记录，含操作人、耗时、IP。

---

### M4 · 其余模块与缓存（4～5 天）

- [ ] 项目模块（分页/搜索/增删改，JSON 字段存 `tech` / `links`）
- [ ] 媒体模块：`POST /api/media/upload`（校验 MIME + 大小）、列表、删除；`StorageService` 接口 + 本地实现 + 静态资源映射
- [ ] 站点配置：读取 / 保存 + 保存后清缓存
- [ ] 仪表盘统计：总数、各状态文章数、最近更新列表（**一条聚合 SQL** 而非多次查询）
- [ ] 导出 JSON / 导入 JSON（差异预览 + 事务写入）
- [ ] **Redis 缓存**：文章详情 `@Cacheable`、列表按条件缓存、写操作 `@CacheEvict`
- [ ] 前端：剩余模块全部接通（媒体、配置、设置、仪表盘）
- [ ] 删除前端所有 Supabase 依赖与依赖包

**验收**：
1. 连续两次请求文章详情，第二次**不查库**（日志或 Redis key 可见）；编辑后缓存被清除；
2. 前端**全量回归**通过（复用 `ADMIN-STAGE2-REQUIREMENTS.md` §8 的验收清单）；
3. `package.json` 中不再有 `@supabase/supabase-js`。

---

### M5 · 工程化与部署（3～4 天）

- [ ] Service 层单测（Mockito）：状态机合法/非法流转、乐观锁冲突、事务边界
- [ ] Controller 层 MockMvc 测试：登录、鉴权 401/403、参数校验失败
- [ ] 多阶段 `Dockerfile`（构建 + 运行分离）
- [ ] `docker-compose.yml` 完整版：app + mysql + redis + 初始化脚本
- [ ] GitHub Actions：`mvn -B verify` + 镜像构建
- [ ] 部署到服务器：Nginx 反向代理 `/api` + HTTPS（顺带解决浏览器安全上下文）
- [ ] 请求日志补齐 TraceId 与耗时

**验收**：新机器上 `git clone && docker compose up -d` → 前后端全部可用；CI 绿色；线上地址可访问。

---

### M6 · 交付与答辩（2～3 天）

- [ ] **重写 README**：项目定位、架构图、技术选型与理由、快速开始、接口一览、演示账号
- [ ] 存量数据迁移（Supabase JSON → MySQL）并校验条数一致
- [ ] 压测数据（可用 `ab` / `wrk` / JMeter）：列表接口 QPS 与 P95，缓存命中前后对比
- [ ] 答辩 PPT：问题 → 方案 → 关键取舍 → 数据
- [ ] **演示脚本**（见 §5）预先演练 3 遍

**验收**：一个不懂项目的人，5 分钟内能看懂 README 并跑起来。

---

## 3. 时间安排（三种档位）

| 档位 | 总时长 | 包含 | 适用 |
| --- | --- | --- | --- |
| **冲刺版** | 2 周 | M0 + M1 + M2 + **M3**（砍 M4 的缓存与部分模块、M5 只留 Docker、不做测试） | 距离答辩很近 |
| **标准版（推荐）** | 5 周 | M0 ～ M5 全部 | 时间正常 |
| **充裕版** | 7 周 | M0 ～ M6 + 更多测试 + 压测 + 中文分词检索 | 想拿更高评价 |

**每周节奏建议**：周一到周四写功能，周五自测 + 补文档 + 提交代码（保持规范的 Git 历史）。

---

## 4. 任务依赖关系

```
M0 骨架 ─▶ M1 建模与认证 ─▶ M2 文章 CRUD ─▶ M3 业务深度 ─▶ M4 其余模块与缓存 ─▶ M5 工程化 ─▶ M6 交付
                  │                    │
                  └── 前端 lib/api.ts 可在 M2 开始并行接入（不必等后端全做完）
```

- **前端接入宜早不宜迟**：M2 一完成就接通文章模块，能尽早暴露接口设计问题；
- **M3 期间不要动前端其它模块**，集中精力把三个核心机制做扎实。

---

## 5. 答辩演示脚本（按顺序演，最有冲击力）

| 步骤 | 操作 | 想传达的能力 |
| --- | --- | --- |
| 1 | 打开 Swagger，圈出全部接口分组 | 接口契约与文档规范 |
| 2 | 用错误密码连错 5 次 → 触发账号锁定 | 安全 + Redis 计数 |
| 3 | 登录后复制 access token，去 jwt.io 解码展示 payload | 理解无状态鉴权 |
| 4 | 登出，再用同一 token 请求 → 401 | 无状态 token 的主动吊销 |
| 5 | 两个浏览器同时编辑同一篇文章，后提交者报错「已被他人修改」 | 乐观锁与并发控制 |
| 6 | 断点注入异常触发发布失败，展示数据库无脏数据 | 事务与一致性 |
| 7 | 打开回收站，恢复一篇文章 | 逻辑删除与数据安全 |
| 8 | 查审计日志，指出刚才那几次操作都有记录 | AOP 与可观测性 |
| 9 | `redis-cli keys 'luoji:*'` 展示缓存 key；第二次请求不再查库 | 缓存设计与失效策略 |
| 10 | `docker compose up -d` 一条命令重建全套环境 | 容器化与可交付性 |

> **不要把时间花在演示页面有多漂亮上**——前端是现成的，重点全部放在「后端机制」和「为什么这么做」。

---

## 6. 时间不够时的砍需求顺序

**从后往前砍，前三项保留**：

| 顺序 | 砍掉 | 影响 |
| --- | --- | --- |
| 1 | 浏览量统计 | 无 |
| 2 | 中文分词 / 全文检索（本就未做） | 无 |
| 3 | 导入导出 | 少一个展示点 |
| 4 | 审计日志的**查询页面**（保留写入与数据） | 少一个展示点，但数据仍在 |
| 5 | 媒体库（改为正文直接外链图片） | 少一个模块 |
| 6 | 缓存 | ❌ 不建议砍——「缓存」是面试高频考点，砍了少一个可讲点 |
| 7 | 测试覆盖（保留核心 3～5 个用例） | 可接受 |
| — | **M3：状态机 / 事务 / 乐观锁 / 审计** | ❌ **绝对不能砍**，这是整个改造的意义 |

---

## 7. 里程碑 ↔ 简历条目对照

> 每个里程碑都能直接产出一条可写进简历的成果。

| 里程碑 | 可写入简历的表述 |
| --- | --- |
| M1 | 基于 **Spring Security + JWT 双 token** 设计无状态鉴权，结合 Redis 黑名单实现登出即时失效，并实现登录失败锁定与登录日志 |
| M2 | 将原前端内存中的搜索/排序/分页**下沉至 SQL**，通过复合索引（最左前缀）支撑万级数据分页查询 |
| M3 | 使用 **`@Transactional` 保证文章发布跨 3 张表的原子性**；引入**版本号乐观锁**解决并发编辑覆盖问题并返回 409；基于 **AOP + 自定义注解**实现零侵入操作审计 |
| M4 | 引入 **Redis 缓存**热点文章并设计写时失效策略，列表接口响应从 XX ms 降至 XX ms |
| M5 | 使用 **Docker Compose + GitHub Actions** 实现一键环境重建与持续集成，Nginx 反向代理 + HTTPS 部署 |
| M6 | 完成存量数据从 PostgreSQL 到 MySQL 的**迁移与字段映射**，编写架构文档与接口契约 |

---

## 8. 交付物清单

| 类别 | 交付物 |
| --- | --- |
| 代码 | `backend/`（Spring Boot 工程，分层清晰、规范提交）、`src/`（前端，仅数据访问层改动） |
| 数据库 | Flyway 迁移脚本（建表 + 种子数据 + 存量数据） |
| 配置 | `docker-compose.yml`、`Dockerfile`、`.env.example`、`application-*.yml` |
| CI | `.github/workflows/backend-ci.yml` |
| 文档 | `BACKEND-REQUIREMENTS.md` / `BACKEND-ARCHITECTURE.md` / `BACKEND-PLAN.md` / 重写后的 README |
| 演示 | Swagger 地址、压测报告、答辩 PPT、演示脚本 |

---

## 9. 风险与应对

| # | 风险 | 应对 |
| --- | --- | --- |
| 1 | Spring Security 过滤链配置复杂，容易卡住 | 先用「放行全部 + 手写拦截器」跑通，再替换为标准 `SecurityFilterChain`；不要一上来啃源码 |
| 2 | 前端改造引发回归问题 | 保持接口字段名与前端类型一致；每完成一个模块就回归一次，不要攒到最后 |
| 3 | 事务/乐观锁写对了但「讲不出来」 | 每个机制都在文档里写清「为什么用它、不用它会怎样」，答辩前自己复述一遍 |
| 4 | 范围膨胀（想加 Redis 集群、MQ、微服务） | 回到 `BACKEND-REQUIREMENTS.md` §2.3「明确不做」清单，逐条对照 |
| 5 | 后期时间不够 | 按 §6 顺序砍，**M3 优先保证** |
| 6 | 只写代码不写文档，答辩时说不清 | 每个里程碑结束当天补文档与提交记录，不留到最后 |

---

## 10. 变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1.0 | 2026-09-11 | 初版：技能预检、M0～M6 里程碑与任务清单、三种时间档位、依赖关系、答辩演示脚本、砍需求顺序、简历对照表、交付物与风险 |
