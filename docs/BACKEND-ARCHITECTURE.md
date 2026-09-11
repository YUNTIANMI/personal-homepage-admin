# luoji-blog · 后端技术架构文档

| 项 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 撰写日期 | 2026-09-11 |
| 适用范围 | 后端改造的技术选型、分层、关键机制、数据库与接口契约 |
| 关联文档 | [`BACKEND-REQUIREMENTS.md`](./BACKEND-REQUIREMENTS.md)（需求）· [`BACKEND-PLAN.md`](./BACKEND-PLAN.md)（计划） |
| 设计原则 | **单体分层 + 常规做法优先**。每个技术选择都要能一句话讲清理由，不做炫技式选型 |

---

## 1. 技术选型

### 1.1 最终选型

| 层次 | 选型 | 版本 | 一句话理由 |
| --- | --- | --- | --- |
| 语言 | **Java** | 17（LTS，可用 21） | Spring Boot 3 最低要求 17；国内后端岗位主流 |
| 框架 | **Spring Boot** | 3.x | 事实标准，生态与面试匹配度最高 |
| Web | Spring MVC（内嵌 Tomcat） | 随 Boot | REST 开发最常规组合 |
| 持久层 | **MyBatis-Plus** | 3.5.x | 国内使用最广；自带分页、乐观锁、逻辑删除、自动填充插件，正好覆盖本项目要展示的机制 |
| 数据库 | **MySQL** | 8.0 | 国内面试最认（B+ 树索引、事务隔离级别、explain 都是高频题） |
| 缓存 | **Redis** | 7.x | 缓存 / token 黑名单 / 登录失败计数，一个组件三处用 |
| 鉴权 | **Spring Security + JWT** | Security 6 / jjwt 0.12.x | 无状态鉴权是常规做法；Security 的过滤链是面试重点 |
| 接口文档 | **springdoc-openapi** | 2.x | 注解即文档，答辩可直接演示 Swagger UI |
| 数据库迁移 | **Flyway** | 10.x | 版本化 DDL，替代「手工去控制台执行 SQL」 |
| 参数校验 | Jakarta Validation（`@Valid`） | 随 Boot | 声明式校验，错误统一由全局异常处理 |
| 日志 | SLF4J + Logback | 随 Boot | 请求日志含 TraceId 与耗时 |
| 构建 | **Maven** | 3.9+ | 国内主流 |
| 容器化 | **Docker + Docker Compose** | — | 一键起 app + mysql + redis |
| CI | GitHub Actions | — | lint / test / build |

> 版本以引入时官方最新稳定版为准，本文档只锁大版本。

### 1.2 被否决的选项及原因（答辩常被问）

| 选项 | 否决原因 |
| --- | --- |
| Spring Data JPA | SQL 不够直观，国内面试对 MyBatis 更友好；且 MP 的插件正好覆盖本项目要展示的机制 |
| PostgreSQL（沿用 Supabase） | 技术上行得通，但国内岗位与面试题以 MySQL 为主；本项目数据量极小，迁移成本几乎为 0 |
| 微服务（Spring Cloud） | 单人项目引入注册中心/网关属于过度设计，且会**稀释**核心能力展示 |
| 消息队列 | 本项目没有异步解耦场景，硬加会被追问「为什么需要 MQ」 |
| Sa-Token 等轻量鉴权库 | 上手快但绕过了 Spring Security 的过滤链，**面试考点丢失** |
| 自研文件存储服务 | 用本地磁盘 + `StorageService` 接口抽象即可，保留替换 OSS 的扩展点 |

---

## 2. 总体架构

**单体分层架构**（不是微服务），一次请求的完整链路：

```
┌──────────────────────────────────────────────────────────────┐
│  浏览器（既有 React 前端，仅改数据访问层）                        │
└───────────────────────────┬──────────────────────────────────┘
                            │ fetch('/api/**')  Authorization: Bearer <access>
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Spring Boot 单体应用                                          │
│                                                              │
│  ① CORS / 过滤器链                                            │
│     └─ JwtAuthenticationFilter                               │
│         ├─ 解析 token（签名、过期）                              │
│         ├─ 查 Redis 黑名单（登出立即失效）                        │
│         └─ 构建 Authentication → SecurityContext               │
│                                                              │
│  ② Controller 层   —— 只做参数接收、@Valid 校验、返回 Result      │
│                        无 if 业务判断、无 SQL                   │
│                                                              │
│  ③ Service 层      —— 业务规则、状态机、@Transactional、缓存注解   │
│                        不出现 HttpServletRequest / ResponseEntity│
│                                                              │
│  ④ Mapper 层       —— MyBatis-Plus，复杂 SQL 写在 XML            │
│                                                              │
│  ⑤ 横切关注点                                                   │
│     ├─ OperationLogAspect（@Around 异步写审计日志）              │
│     └─ GlobalExceptionHandler（统一异常 → Result）              │
└──────────┬────────────────────────────────────┬──────────────┘
           │                                    │
           ▼                                    ▼
   ┌───────────────┐                   ┌───────────────┐
   │   MySQL 8     │                   │    Redis 7    │
   │  12 张业务表    │                   │ 缓存 / 黑名单   │
   └───────────────┘                   └───────────────┘
```

---

## 3. 代码结构与分层

```
backend/
├── pom.xml
├── Dockerfile
├── docker-compose.yml                # app + mysql + redis
└── src/
    ├── main/java/com/luoji/blog/
    │   ├── BlogApplication.java
    │   │
    │   ├── common/                   # 通用能力（无业务语义）
    │   │   ├── Result.java                   统一响应体
    │   │   ├── PageResult.java               分页响应体
    │   │   ├── ErrorCode.java                业务错误码枚举
    │   │   ├── BizException.java             业务异常
    │   │   ├── GlobalExceptionHandler.java   @RestControllerAdvice
    │   │   └── enums/                        PostStatus / RoleCode / LogModule
    │   │
    │   ├── config/
    │   │   ├── MybatisPlusConfig.java        分页插件 + 乐观锁插件 + 字段填充
    │   │   ├── SecurityConfig.java           过滤链、放行规则、@EnableMethodSecurity
    │   │   ├── RedisConfig.java              序列化策略
    │   │   ├── WebMvcConfig.java             CORS、上传目录静态映射
    │   │   └── OpenApiConfig.java
    │   │
    │   ├── security/
    │   │   ├── JwtTokenProvider.java         签发 / 解析 / 校验
    │   │   ├── JwtAuthenticationFilter.java  每次请求的鉴权入口
    │   │   ├── LoginUser.java                登录用户上下文（userId/username/roles）
    │   │   ├── SecurityUtils.java            便捷取当前用户
    │   │   └── TokenBlacklistService.java    Redis 黑名单
    │   │
    │   ├── annotation/OperationLog.java      自定义注解
    │   ├── aspect/OperationLogAspect.java    AOP 实现
    │   │
    │   ├── controller/               # 每个资源一个 Controller
    │   │   ├── AuthController.java
    │   │   ├── PostController.java
    │   │   ├── TagController.java
    │   │   ├── ProjectController.java
    │   │   ├── MediaController.java
    │   │   ├── SiteConfigController.java
    │   │   ├── LogController.java
    │   │   └── DashboardController.java
    │   │
    │   ├── service/                  # 接口
    │   │   └── impl/                 # 实现（业务逻辑都在这层）
    │   │
    │   ├── mapper/                   # 继承 BaseMapper<T>
    │   ├── entity/                   # 与表一一对应
    │   ├── dto/                      # 入参，带校验注解
    │   └── vo/                       # 出参，贴合前端期望的结构
    │
    ├── main/resources/
    │   ├── application.yml           # 公共配置
    │   ├── application-dev.yml
    │   ├── application-prod.yml
    │   ├── mapper/*.xml              # 复杂查询 SQL
    │   └── db/migration/             # Flyway：V1__init.sql / V2__seed.sql ...
    │
    └── test/java/com/luoji/blog/
        ├── service/PostServiceTest.java        Mockito 单测（状态机、乐观锁）
        └── controller/PostControllerTest.java  MockMvc 接口测试
```

### 分层纪律（写进 Code Review 清单）

| 约束 | 说明 |
| --- | --- |
| Controller **不得**出现业务 `if` 与 SQL | 只做「收参 → 调 Service → 包 Result」 |
| Controller **不得**直接返回 Entity | 一律返回 `VO`，避免泄漏表结构与 `deleted` 等内部字段 |
| Service **不得**依赖 `HttpServletRequest` | 需要 IP/UA 时通过参数从 Controller 传入 |
| Entity **不得**作为接口出入参 | 入参用 `DTO`、出参用 `VO` |
| 跨表写操作**必须**在同一个 `@Transactional` 内 | 见 §4.6 |

---

## 4. 关键机制设计

### 4.1 统一响应体与错误码

```java
public class Result<T> {
    private int code;        // 0 = 成功；非 0 = 业务错误码
    private String message;
    private T data;
}
```

```java
public enum ErrorCode {
    SUCCESS(0, "成功"),
    PARAM_INVALID(40000, "参数校验失败"),
    FILE_TOO_LARGE(40001, "文件超过大小限制"),
    UNAUTHORIZED(40100, "未登录或登录已过期"),
    TOKEN_EXPIRED(40101, "登录已过期，请重新登录"),
    FORBIDDEN(40300, "没有操作权限"),
    NOT_FOUND(40400, "资源不存在"),
    VERSION_CONFLICT(40900, "内容已被他人修改，请刷新后重试"),
    STATE_ILLEGAL(40901, "当前状态不允许该操作"),
    ACCOUNT_LOCKED(42300, "账号已锁定，请稍后再试"),
    SERVER_ERROR(50000, "服务器内部错误");
}
```

- **HTTP 状态码与业务码分离**：HTTP 只表达传输/语义（200/400/401/403/404/409/500），业务细分靠 `code`；
- `GlobalExceptionHandler` 统一兜住 `BizException` / `MethodArgumentNotValidException` / `Exception`，**Controller 里不写 try-catch**。

### 4.2 参数校验

```java
public class PostSaveDTO {
    @NotBlank(message = "标题不能为空")
    @Size(max = 100, message = "标题不能超过 100 字")
    private String title;

    @NotNull @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    @NotBlank @Size(min = 6, message = "正文至少 6 个字符")
    private String content;

    /** 乐观锁版本号：新增时为空，编辑时必填 */
    private Integer version;
}
```

### 4.3 鉴权链（JWT 双 token）

| 环节 | 设计 |
| --- | --- |
| 登录 | `POST /api/auth/login` → BCrypt 校验 → 签发 `access`（30 min）+ `refresh`（7 d，存 Redis 可主动吊销） |
| access 载荷 | `sub`=userId、`username`、`roles`、`jti`、`exp` |
| 每次请求 | `JwtAuthenticationFilter` 解析签名与过期 → 查 Redis 黑名单（按 `jti`）→ 塞入 `SecurityContext` |
| 静默续期 | `POST /api/auth/refresh`，用 refresh 换新 access |
| 登出 | 把 access 的 `jti` 写 Redis 黑名单，TTL = 该 token 剩余有效期 → **立即失效** |
| 改密 | 吊销该用户全部 refresh + 记 `tokenVersion`，旧 access 全部失效 |
| 授权 | `@PreAuthorize("hasRole('ADMIN')")`，方法级注解 |

> **为什么需要 Redis 黑名单？** 因为 JWT 是无状态的，签出去就无法收回。这是「无状态鉴权 + 主动吊销」这一矛盾的标准解法，也是高频面试题。
>
> **为什么 access 短、refresh 长？** 降低 access 泄漏的风险窗口，同时用 refresh 避免用户频繁登录。

### 4.4 乐观锁（并发编辑）

```java
@Version
private Integer version;    // MyBatis-Plus 自动生效
```

配置 `OptimisticLockerInnerInterceptor` 后，更新语句变为：

```sql
UPDATE post SET title = ?, ..., version = version + 1
WHERE id = ? AND version = ? AND deleted = 0
```

- 影响行数为 **0** → 说明期间已被他人修改 → 抛 `VERSION_CONFLICT(409)`；
- 前端收到 409 后提示「内容已被他人修改，请刷新后重试」，由用户决定是否覆盖。

> **为什么不用悲观锁？** 编辑表单会长时间停留，悲观锁需要长事务持锁，会阻塞所有读者，代价远大于冲突发生的概率。

### 4.5 逻辑删除与自动填充

```java
@TableLogic
private Integer deleted;                 // 删除 = UPDATE deleted = 1

@TableField(fill = FieldFill.INSERT)
private LocalDateTime createdAt;

@TableField(fill = FieldFill.INSERT_UPDATE)
private LocalDateTime updatedAt;
```

- 业务代码**永不手写** `deleted = 0`，由 MyBatis-Plus 统一追加，避免漏写；
- 回收站 = 查询条件临时切换为「已删除」；恢复 = 把 `deleted` 置回 0；
- 时间戳由 `MetaObjectHandler` 统一填充，避免每处手写。

### 4.6 事务（发布流程）

```java
@Transactional(rollbackFor = Exception.class)
public void publish(Long postId) {
    Post post = postMapper.selectById(postId);              // 1. 查
    postStatusMachine.check(post.getStatus(), PUBLISHED);   // 2. 状态机校验
    post.setStatus(PUBLISHED);
    post.setPublishedAt(LocalDateTime.now());
    int rows = postMapper.updateById(post);                 // 3. 乐观锁更新
    if (rows == 0) throw new BizException(ErrorCode.VERSION_CONFLICT);

    revisionService.saveSnapshot(post);                     // 4. 插入历史版本
    // 5. 审计日志由 @OperationLog AOP 异步写入
}
```

**一次发布跨 3 张表的写入必须原子**：任何一步失败，全部回滚，不允许出现「状态已发布但没有版本快照」的中间态。

> **注意点（面试常问）**：`@Transactional` 基于代理，**同类内部自调用不生效**；且默认只对 `RuntimeException` 回滚，受检异常需显式声明 `rollbackFor`。

### 4.7 状态机（把 CRUD 变成业务）

```
        publish              archive
草稿 ──────────────▶ 已发布 ──────────────▶ 已归档
  │                    │                      │
  └──── publish ───────┘                    （终态）
```

| 当前状态 | 允许操作 | 非法示例 |
| --- | --- | --- |
| `DRAFT` | 编辑、发布、删除 | — |
| `PUBLISHED` | 编辑、归档、下架为草稿、删除 | — |
| `ARCHIVED` | 查看、恢复为草稿、删除 | ❌ 直接 `ARCHIVED → PUBLISHED` |

非法流转统一抛 `STATE_ILLEGAL(409)`，由枚举集中定义合法边，避免散落的 `if` 判断。

### 4.8 AOP 审计日志

```java
@OperationLog(module = LogModule.POST, action = "PUBLISH")
@PostMapping("/{id}/publish")
public Result<Void> publish(@PathVariable Long id) {
    postService.publish(id);
    return Result.ok();
}
```

`OperationLogAspect` 用 `@Around` 环绕通知：取当前用户、IP、方法耗时、成功与否，写入 `operation_log`（`@Async` 异步，不阻塞主流程）。

> **价值**：新增一个写操作只需加一行注解，日志逻辑零侵入——这是 AOP 的典型应用场景。

### 4.9 缓存策略

| 场景 | 做法 |
| --- | --- |
| 文章详情 | `@Cacheable(value = "post:detail", key = "#id")`，TTL 30 min |
| 文章列表（首页/后台） | 按「页码 + 筛选条件」拼 key，TTL 5 min |
| 写操作后失效 | `@CacheEvict(value = {"post:detail", "post:list"}, allEntries = true)` |
| 配置变更 | 保存后清 `site:config`，保证展示端立即可见 |
| 防穿透 | 查询为空时缓存空值 60 s |
| 浏览量 | `RedisTemplate.opsForValue().increment("post:view:" + id)`，定时任务每 5 min 落库 |

> **为什么不追求强一致？** 个人站点对「延迟 5 分钟看到浏览量」完全可接受，用 TTL + 写时失效换取简单性，是常见取舍。

### 4.10 登录风控

- 登录失败：`INCR login:fail:{username}`，`EXPIRE` 15 min；
- 达到 5 次 → 写 `sys_user.locked_until`，登录直接返回 `ACCOUNT_LOCKED(423)`；
- 登录成功 → 删除计数、重置 `fail_count`；
- 每次都写 `login_log`（成功与失败都记）。

---

## 5. 数据库设计

**12 张表**。设计原则：**多对多、历史版本、审计、逻辑删除、乐观锁各出现一次**，覆盖常规建模手法；同时**刻意避免**为「技术标签/外链」建关联表（用 JSON 字段），以减少前端改造。

### 5.1 权限模块

```sql
-- 账号
CREATE TABLE sys_user (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  username     VARCHAR(50)  NOT NULL,
  password     VARCHAR(100) NOT NULL COMMENT 'BCrypt 哈希，绝不存明文',
  nickname     VARCHAR(50)  NOT NULL DEFAULT '',
  email        VARCHAR(100) NOT NULL DEFAULT '',
  status       TINYINT      NOT NULL DEFAULT 1  COMMENT '1 启用 / 0 禁用',
  fail_count   INT          NOT NULL DEFAULT 0,
  locked_until DATETIME     NULL,
  token_version INT         NOT NULL DEFAULT 0 COMMENT '自增即吊销该用户全部 token',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted      TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员/编辑账号';

-- 角色字典
CREATE TABLE sys_role (
  id   BIGINT      NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL COMMENT 'ADMIN / EDITOR',
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户-角色（多对多）
CREATE TABLE sys_user_role (
  id      BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_role (user_id, role_id),
  KEY idx_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> ⚠️ **已知取舍**：`username` 唯一索引与逻辑删除共存时，已删除的用户名无法被重新注册。个人项目可接受；若要支持，需改为「唯一索引包含 `deleted`」或在删除时改写用户名。

### 5.2 内容模块

```sql
CREATE TABLE post (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  title        VARCHAR(100) NOT NULL,
  post_date    DATE         NOT NULL COMMENT '展示日期（对应前端 date 字段）',
  category     VARCHAR(50)  NOT NULL DEFAULT '' COMMENT '保留字符串，不建分类表，避免前端改造',
  summary      VARCHAR(300) NOT NULL DEFAULT '',
  content      MEDIUMTEXT   NOT NULL COMMENT 'Markdown 正文',
  status       VARCHAR(20)  NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT / PUBLISHED / ARCHIVED',
  is_top       TINYINT      NOT NULL DEFAULT 0,
  sort         INT          NOT NULL DEFAULT 0,
  view_count   INT          NOT NULL DEFAULT 0,
  version      INT          NOT NULL DEFAULT 0 COMMENT '乐观锁',
  published_at DATETIME     NULL,
  author_id    BIGINT       NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted      TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_list    (deleted, status, is_top DESC, sort DESC, post_date DESC),
  KEY idx_updated (deleted, updated_at DESC),
  KEY idx_pubdate (deleted, status, published_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章';

CREATE TABLE tag (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  name       VARCHAR(50) NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted    TINYINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文章-标签（多对多）
CREATE TABLE post_tag (
  id      BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  tag_id  BIGINT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_post_tag (post_id, tag_id),
  KEY idx_tag (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文章历史版本
CREATE TABLE post_revision (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  post_id    BIGINT       NOT NULL,
  version    INT          NOT NULL,
  title      VARCHAR(100) NOT NULL,
  summary    VARCHAR(300) NOT NULL DEFAULT '',
  content    MEDIUMTEXT   NOT NULL,
  editor_id  BIGINT       NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_post_version (post_id, version),
  KEY idx_post (post_id, version DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发布时留存快照，支持回滚';

CREATE TABLE project (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80)  NOT NULL,
  tagline    VARCHAR(200) NOT NULL DEFAULT '',
  tech       JSON         NULL COMMENT 'string[]，不做关联表',
  links      JSON         NULL COMMENT '[{id,label,href}]，不做关联表',
  is_top     TINYINT      NOT NULL DEFAULT 0,
  sort       INT          NOT NULL DEFAULT 0,
  version    INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted    TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_list (deleted, is_top DESC, sort DESC, name),
  KEY idx_name (deleted, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> **为什么 `category` 保留字符串、而 `tag` 建了关联表？** 前端里分类是自由文本输入框、标签是数组；把分类改成关联表会强迫前端改交互，而标签改成关联表**接口仍返回 `string[]`**，前端无感。这就是「建模能力」与「改动成本」之间的取舍。

### 5.3 媒体、配置、日志

```sql
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE site_config (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  name       VARCHAR(50)  NOT NULL DEFAULT '',
  en         VARCHAR(50)  NOT NULL DEFAULT '',
  role       VARCHAR(80)  NOT NULL DEFAULT '',
  headline   VARCHAR(120) NOT NULL DEFAULT '',
  intro      VARCHAR(500) NOT NULL DEFAULT '',
  github     VARCHAR(200) NOT NULL DEFAULT '',
  email      VARCHAR(100) NOT NULL DEFAULT '',
  tech       JSON         NULL,
  start_year INT          NOT NULL DEFAULT 2026,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单行配置表';

CREATE TABLE operation_log (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  user_id     BIGINT       NULL,
  username    VARCHAR(50)  NOT NULL DEFAULT '',
  module      VARCHAR(30)  NOT NULL COMMENT 'POST / PROJECT / MEDIA / CONFIG / ACCOUNT',
  action      VARCHAR(30)  NOT NULL COMMENT 'CREATE / UPDATE / DELETE / PUBLISH / IMPORT',
  target_id   BIGINT       NULL,
  detail      JSON         NULL COMMENT '变更摘要（字段级 diff 或关键参数）',
  ip          VARCHAR(45)  NOT NULL DEFAULT '',
  duration_ms INT          NOT NULL DEFAULT 0,
  success     TINYINT      NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_query (module, created_at DESC),
  KEY idx_user  (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 5.4 索引设计说明（答辩可讲）

| 索引 | 服务的查询 |
| --- | --- |
| `post.idx_list (deleted, status, is_top DESC, sort DESC, post_date DESC)` | 后台列表与展示端列表的默认排序，**最左前缀**命中 |
| `post.idx_updated (deleted, updated_at DESC)` | 仪表盘「最近更新」 |
| `post_tag.idx_tag (tag_id)` | 「按标签查文章」（覆盖 `post_id` 回表） |
| `post_revision.uk_post_version` | 同一文章版本号唯一，防并发写入重复快照 |
| `operation_log.idx_query (module, created_at DESC)` | 审计日志按模块 + 时间倒序分页 |

> 所有查询索引都**以 `deleted` 打头**——因为逻辑删除后每条 SQL 都会带 `deleted = 0`。
>
> 中文全文检索先不引入（`LIKE '%kw%'` 无法走索引但数据量小无碍）；预留方案：MySQL `FULLTEXT ... WITH PARSER ngram`，或独立检索组件。

---

## 6. 接口契约

> 前缀 `/api`。除登录与展示端只读接口外，全部需要 `Authorization: Bearer <access>`。
> 响应统一为 `{ code, message, data }`，下列只写 `data` 形态。

### 6.1 认证

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/login` | 登录，返回 `{ accessToken, refreshToken, expiresIn, user }` |
| POST | `/api/auth/refresh` | 用 refresh 换新 access |
| POST | `/api/auth/logout` | 登出（token 入黑名单） |
| GET | `/api/auth/me` | 当前用户信息与角色 |
| PUT | `/api/auth/password` | 修改密码（校验旧密码，成功后吊销全部 token） |

### 6.2 文章

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/posts` | 分页列表：`page`、`size`、`keyword`、`status`、`sortBy`、`order` |
| GET | `/api/posts/{id}` | 详情 |
| POST | `/api/posts` | 新建（默认草稿） |
| PUT | `/api/posts/{id}` | 更新（**携带 `version`**） |
| PUT | `/api/posts/{id}/status` | 状态流转：`{ "status": "PUBLISHED" }` |
| PUT | `/api/posts/{id}/top` | 置顶开关 / 权重 |
| DELETE | `/api/posts/{id}` | 逻辑删除 |
| DELETE | `/api/posts` | 批量删除：`{ "ids": [1,2,3] }` |
| GET | `/api/posts/{id}/revisions` | 历史版本列表 |
| POST | `/api/posts/{id}/revisions/{version}/rollback` | 回滚到指定版本 |
| GET | `/api/posts/trash` | 回收站列表 |
| PUT | `/api/posts/{id}/restore` | 从回收站恢复 |

### 6.3 其余

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET/POST/PUT/DELETE | `/api/projects/**` | 同文章，无状态机与版本快照 |
| GET | `/api/tags` | 标签列表（供编辑器下拉） |
| POST | `/api/media/upload` | `multipart/form-data` 上传，返回 `{ url, path, size }` |
| GET | `/api/media` | 媒体分页列表 |
| DELETE | `/api/media/{id}` | 删除记录 |
| GET / PUT | `/api/site-config` | 站点配置读取 / 保存 |
| GET | `/api/dashboard/stats` | 仪表盘统计（总数、各状态数、最近更新） |
| GET | `/api/logs/operation` | 操作日志分页查询 |
| GET | `/api/logs/login` | 登录日志分页查询 |
| GET | `/api/export` | 导出全量 JSON |
| POST | `/api/import` | 导入（先预览差异，后确认写入，事务保证） |
| GET | `/api/config/import-preview` | 导入前差异预览 |

**关键契约约定**：文章列表返回的 `date`（`yyyy-MM-dd`）、`tags: string[]`、`isSample` 等字段名**与前端现有类型完全一致**——这是前端只需改数据访问层的原因。

---

## 7. 工程规范

| 项 | 做法 |
| --- | --- |
| 配置分环境 | `application-dev.yml` / `application-prod.yml`；敏感项（DB 密码、JWT 密钥）走环境变量，**不入库** |
| 数据库变更 | **Flyway**：`V1__init_schema.sql`、`V2__seed_data.sql`；禁止手工改表，脚本随代码走 |
| 接口文档 | springdoc-openapi，`/swagger-ui.html` 可直接演示 |
| 日志 | 请求日志（方法、路径、用户、耗时、TraceId）；错误日志含堆栈；生产用 JSON 格式便于采集 |
| 测试 | Service 层 Mockito 单测（状态机、乐观锁、事务边界）+ Controller 层 MockMvc 接口测试；覆盖核心分支即可，不追求覆盖率数字 |
| 代码风格 | 统一 `Result` 返回、统一命名（`XxxController/Service/Mapper/DTO/VO`）、Lombok 简化样板 |
| CI | GitHub Actions：`mvn -B verify`（编译 + 测试）→ 构建镜像 |
| 容器化 | `docker-compose up -d` 一键起 app + mysql + redis，含初始化 SQL |

---

## 8. 部署架构

```
                ┌──────────────────────────────┐
   用户/面试官 ──▶│  Nginx（HTTPS + 反向代理）       │
                │   /        → 前端静态文件        │
                │   /api/**  → 后端 :8080        │
                └───────────────┬──────────────┘
                                ▼
                ┌──────────────────────────────┐
                │  Spring Boot 容器              │
                └───────┬──────────────┬───────┘
                        ▼              ▼
                 ┌───────────┐  ┌───────────┐
                 │  MySQL    │  │  Redis    │
                 │ （卷持久化）│  │ （可选持久化）│
                 └───────────┘  └───────────┘
```

- 单机 Docker Compose 即可，**不需要 K8s**（与「最小但规范」的定位一致）；
- 前端仍是静态产物，可与 Nginx 同机部署；
- 通过 Nginx 统一到**同一域名**下的 `/api` 前缀，顺带解决 HTTPS（浏览器安全上下文问题一并消失）。

### 存量数据迁移（一次性）

现有 Supabase（PostgreSQL）里已有文章与站点配置，迁移三步：

1. 用 anon key 导出 JSON（`GET /rest/v1/posts` 等）；
2. 写一个一次性脚本把字段映射到 MySQL（`date → post_date`、补 `status='PUBLISHED'`、`version=0`）；
3. 当作 `V2__seed_data.sql` 或走导入接口灌入。

> 这一步本身就是可讲的工程点：**存量数据迁移 + 字段映射 + 幂等重跑**。

---

## 9. 变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1.0 | 2026-09-11 | 初版：技术选型（含否决理由）、单体分层架构、9 项关键机制、12 张表 DDL 与索引说明、接口契约、工程规范与部署架构 |
