# luoji-blog · 罗辑个人主页（展示站点 + 后台管理）

一个应用、两个区域：**访客看到的是只读展示站点，登录后进入后台管理发布内容。**

技术形态：**前端 React + TypeScript，后端 Java + Spring Boot（自研）**，用于展示常规后端开发能力——分层架构、鉴权授权、事务、并发控制、缓存、审计日志等。

> **与源项目的关系**：本项目由 [personal-homepage](https://github.com/YUNTIANMI/personal-homepage)（`luoji-home`）复制而来，前端沿用，后端从 Supabase 托管服务改造为自研 Spring Boot。源项目已冻结，保持独立可运行。

---

## 一、两个区域

| 区域 | 地址 | 访问者 | 说明 |
| --- | --- | --- | --- |
| 展示站点 | `/` | 任何人，无需登录 | 首页 / 博客 / 项目 / 关于，**页内切换** |
| 登录 | `/login` | 管理员 | 用户名 + 密码 |
| 后台管理 | `/admin` 及子路由 | 管理员（登录后） | 仪表盘 / 文章管理 / 项目管理 / 媒体库 / 站点配置 / 设置 / 回收站 |

- 展示站点**不含任何写入入口**，只读浏览；
- 未登录访问 `/admin/*` 会重定向 `/login`，登录后跳回原页面；
- 其余任意路径落到展示站点，对外不出现 404。

## 二、技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 18 + TypeScript 5.7 + Vite 6 + Tailwind CSS v4 |
| 前端路由 | react-router-dom（`/` 展示 · `/admin` 后台） |
| 后端 | Java 17 + Spring Boot 3.x + MyBatis-Plus + Spring Security + JWT |
| 数据库 | MySQL 8（Flyway 版本化迁移） |
| 缓存 | Redis 7（Spring Cache + token 黑名单 + 浏览量计数） |
| 接口文档 | springdoc-openapi（Swagger UI） |
| 部署 | Docker + Docker Compose + GitHub Actions CI |

## 三、后端能力清单（阶段一 ~ 五已完成）

| 能力 | 落地 |
| --- | --- |
| 分层架构 | Controller / Service / Mapper 三层，Controller 零业务逻辑 |
| 统一响应与异常 | `Result` + `ErrorCode` + `GlobalExceptionHandler` |
| 鉴权授权 | Spring Security + JWT 双 token、Redis 黑名单、ADMIN/EDITOR 两级角色 |
| 事务一致性 | 文章发布跨 `post` + `post_revision` 写入，`@Transactional` 原子 |
| 并发控制 | `@Version` 乐观锁，冲突返回 409 |
| 业务状态机 | 草稿 → 发布 → 归档 → 回退草稿，非法流转拒绝 |
| 历史版本 | 每次发布留快照，可查看与回滚 |
| 回收站 | 逻辑删除 + 恢复 |
| 缓存 | Spring Cache + Redis，写时失效 |
| 浏览量 | Redis 自增 + 定时任务批量落库 |
| 审计日志 | `@OperationLog` + AOP 异步落库 |
| 数据备份 | 导入导出（导入单事务，失败整体回滚） |

详见 [`docs/BACKEND-DEVELOPMENT.md`](./docs/BACKEND-DEVELOPMENT.md)。

---

## 四、操作指南（快速开始）

### 4.1 环境要求

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| Docker + Docker Compose | 任意较新版本 | 一键起后端全栈（推荐） |
| JDK | 17 | 本地开发后端（不用 Docker 时） |
| Maven | 3.9+ | 构建后端 |
| Node.js | ≥ 18 | 前端 |

### 4.2 一键启动后端（Docker Compose，推荐）

```bash
cd backend
docker compose up -d --build
```

这会启动三个容器并自动建表 + 灌入种子数据：

| 服务 | 容器名 | 端口 | 说明 |
| --- | --- | --- | --- |
| MySQL | `luoji-mysql` | `3307` | 数据库（Flyway 自动建表） |
| Redis | `luoji-redis` | `6379` | 缓存 / 黑名单 / 浏览量 |
| 应用 | `luoji-app` | `8080` | Spring Boot 后端 |

启动后验证：

```bash
curl http://localhost:8080/api/ping
# 期望返回 {"code":0,"message":"成功","data":"pong"}
```

> 若只想先起依赖中间件（本地 `mvn` 跑应用），执行 `docker compose up -d mysql redis` 即可。

### 4.3 本地开发后端（不用 Docker 跑应用）

先起 MySQL + Redis（用上一节命令），然后：

```bash
cd backend
# 配置数据库连接（复制模板改密码，见 4.5 环境变量）
cp .env.example .env

# 启动（Maven 不在 PATH 时可用 ./mvnw 或 ./mvnw.cmd）
mvn spring-boot:run
```

应用启动后自动执行 Flyway 迁移建表。Swagger 地址：`http://localhost:8080/swagger-ui.html`。

### 4.4 启动前端

```bash
npm install
npm run dev
```

启动后：

| 入口 | 地址 |
| --- | --- |
| 展示站点 | `http://localhost:5174/` |
| 后台登录 | `http://localhost:5174/login` |

### 4.5 环境变量

**前端**（`.env.local`，已被 gitignore）：

```dotenv
VITE_API_BASE=http://localhost:8080/api
```

**后端**（`backend/.env`，本地 `mvn` 运行时读取）：

```dotenv
DB_HOST=localhost
DB_PORT=3307          # docker compose 的 MySQL 映射端口
DB_NAME=luoji_blog
DB_USER=luoji
DB_PASSWORD=luoji123456
REDIS_HOST=localhost
REDIS_PORT=6379
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=dev
```

### 4.6 内置账号（种子数据）

| 用户名 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `admin123` | ADMIN（全部权限） |
| `editor` | `editor123` | EDITOR（仅内容管理） |

> 首次登录后请立即在「设置」里修改密码。密码要求 ≥ 6 位。

### 4.7 生产部署

- 后端：`docker compose up -d --build`（需通过环境变量覆盖 `JWT_SECRET`、数据库密码等敏感项）；
- 前端：`npm run build` 产出静态文件，部署到任意 HTTPS 静态托管，`VITE_API_BASE` 指向后端地址；
- 用 Nginx 把 `/api/**` 反向代理到后端 8080，前端静态文件与后端同域，浏览器安全上下文问题一并解决。

---

## 五、测试与 CI

```bash
cd backend
mvn test          # 单元测试（状态机、JWT、统一响应体等，纯 JUnit 不依赖外部服务）
```

CI：`.github/workflows/backend-ci.yml`，push 到 main 或 PR 时自动执行 `mvn -B verify`（编译 + 测试）。

---

## 六、目录结构

```
backend/                          Spring Boot 后端（Java 17 + MyBatis-Plus + MySQL + Redis）
├── pom.xml / Dockerfile / docker-compose.yml
└── src/main/java/com/luoji/blog/
    ├── common/                   统一响应、错误码、全局异常、枚举（状态机/日志模块）
    ├── config/                   MyBatis-Plus、Security、Redis 缓存、CORS 等配置
    ├── security/                 JWT 签发/解析、过滤链、黑名单、登录用户上下文
    ├── annotation/ aspect/       @OperationLog 审计注解与 AOP 切面
    ├── controller/ service/ mapper/ entity/ dto/ vo/   分层
    ├── task/                     ViewCountTask 浏览量定时落库
    └── resources/db/migration/   Flyway 建表与种子数据
src/                              前端（React + TypeScript）
├── lib/api.ts                    自研后端 API 数据层（fetch 封装 + JWT + 自动 refresh）
├── lib/storage.ts                媒体上传
├── store.tsx                     数据仓库
├── auth/                         AuthProvider + ProtectedRoute
└── pages/                        展示站点页面 + 后台页面
docs/                             需求 / 架构 / 开发 / 排期文档
supabase/migrations/              （历史遗留，已不再使用，后端改用 Flyway）
```

## 七、相关文档

| 文档 | 内容 |
| --- | --- |
| `docs/BACKEND-REQUIREMENTS.md` | 后端改造需求（功能只增不减、「最小但完备」判定标准） |
| `docs/BACKEND-ARCHITECTURE.md` | 技术架构（选型理由、分层、关键机制、12 张表 DDL、接口契约） |
| `docs/BACKEND-DEVELOPMENT.md` | 开发文档（6 阶段、每阶段目标/需求/技术/产出/验收） |
| `docs/BACKEND-PLAN.md` | 排期与交付（工期、演示脚本、砍需求顺序、风险） |
| `docs/ADMIN-REQUIREMENTS.md` | 后台功能需求（前端阶段基线） |
| `docs/ADMIN-STAGE2-REQUIREMENTS.md` | 阶段二开发与验收记录 |

## License

私有项目，版权所有。
