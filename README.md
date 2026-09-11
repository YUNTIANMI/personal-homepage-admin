# luoji-admin · 罗辑个人主页（展示站点 + 后台管理）

一个应用、两个区域：**访客看到的是只读展示站点，你自己登录后进入后台管理发布内容。**

> **与源项目的关系**：本项目由 [personal-homepage](https://github.com/YUNTIANMI/personal-homepage)（`luoji-home`）复制而来。
> **源项目已冻结**，停在 `dafa2d3`，保持独立可运行、不再接受任何改动；
> 所有后续开发只发生在本仓库，两个项目**共用同一个 Supabase 实例**。

---

## 一、两个区域

| 区域 | 地址 | 访问者 | 说明 |
| --- | --- | --- | --- |
| 展示站点 | `/` | 任何人，无需登录 | 首页 / 博客 / 项目 / 关于，**页内切换**（不改地址栏） |
| 登录 | `/login` | 管理员 | 邮箱 + 密码 |
| 后台管理 | `/admin` 及其子路由 | 管理员（登录后） | 仪表盘 / 文章管理 / 项目管理 / 媒体库 / 站点配置 / 设置 |

- 展示站点**不含任何新增 / 编辑 / 删除入口**，也不含任何写入云端的逻辑；
- 未登录访问 `/admin/*` 会重定向到 `/login`，登录后跳回原页面；
- 其余任意路径都会落到展示站点，对外不会出现 404；
- 展示区采用**页内切换**：点导航不改地址栏，因此刷新会回到首页（如需可分享的文章链接，可后续改为独立路由）。

## 二、当前状态

✅ **阶段一已完成并通过端到端验证**：

- 登录鉴权（Supabase Auth，单管理员，7 天登录有效期，双层校验）；
- 仪表盘（文章 / 项目统计、云端状态、最近更新、快捷入口）；
- 文章管理（增删改查、搜索、排序、分页、多选批量删除、Markdown 预览）；
- 项目管理（增删改查、外链校验）；
- 展示站点只读化（访客可浏览，不能修改）。

✅ **阶段二已完成**（范围经确认为 S2.2 / S2.3 / S2.4）：

- **媒体能力**：图片上传（Supabase Storage）、编辑器插入图片（按钮 / 拖拽 / 粘贴）、媒体库（浏览 / 复制链接 / 删除）；
- **站点配置**：站点资料存云端 `site_profile`，后台可视化编辑并实时预览，展示站点读取云端值（含默认值兜底）；
- **运维能力**：数据导入导出（JSON，导入含差异预览）、修改密码（需验证当前密码）。

> 未做项（经确认）：草稿 / 发布状态、置顶排序、文章可分享直链、操作日志、回收站。

✅ **全量端到端回归已通过**（2026-09-11，真实 Supabase + 浏览器自动化）：

| 区域 | 覆盖内容 |
| --- | --- |
| 展示站点 | 首页 / 博客（列表、搜索、空态、阅读页）、项目（空态与有数据）、关于、页内切换不改地址栏、未知路径兜底、移动端导航 |
| 后台 | 路由守卫、登录（校验 / 错误凭据 / 登录后跳回）、仪表盘、文章（增删改查、搜索、3 种排序、分页、多选批量删除、GFM 预览）、项目（增删改查、外链校验、展示站联动）、媒体库（上传 / 删除）、站点配置（校验 / 保存 / 展示站联动）、设置（导出 / 导入差异预览 / 改密校验）、主题切换与持久化、移动端抽屉、登出与守卫复检 |

> 验收明细见 [`docs/ADMIN-STAGE2-REQUIREMENTS.md`](./docs/ADMIN-STAGE2-REQUIREMENTS.md) §8；测试产生的数据已全部清理。

📋 **下一阶段（规划中，尚未开工）**：将后端由 Supabase 托管服务替换为**自研 Java + Spring Boot 服务**，用于展示常规后端开发能力（分层、鉴权、事务、并发控制、缓存、审计）。**功能范围只增不减**，前端预计仅改动数据访问层（约 10%）。规划见 [`docs/BACKEND-REQUIREMENTS.md`](./docs/BACKEND-REQUIREMENTS.md) · [`docs/BACKEND-ARCHITECTURE.md`](./docs/BACKEND-ARCHITECTURE.md) · [`docs/BACKEND-PLAN.md`](./docs/BACKEND-PLAN.md)。

## 三、技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | React 18 + TypeScript 5.7 |
| 构建 | Vite 6（`@vitejs/plugin-react`） |
| 路由 | `react-router-dom`（`/` 展示 · `/admin` 后台） |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite`）+ CSS 变量设计 Token |
| 数据库 | Supabase（`@supabase/supabase-js`，前端直连 + RLS） |
| 鉴权 | Supabase Auth（邮箱 + 密码，单管理员） |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| 图标 | `lucide-react` |

## 四、快速开始

环境要求：Node.js ≥ 18。

```bash
npm install       # 安装依赖
npm run dev       # 开发服务器 → http://localhost:5174
npm run build     # 类型检查 + 生产构建（输出 dist/）
npm run preview   # 本地预览构建产物
npm run typecheck # 仅类型检查
```

启动后：

- 展示站点 → `http://localhost:5174/`
- 后台入口 → `http://localhost:5174/login`

> **访问地址建议用 `localhost` 或 `127.0.0.1`**：它们是浏览器认定的「安全上下文」，Web API 完整可用。
> 若改用局域网 IP（如 `http://10.14.6.176:5174`）访问，会进入**非安全上下文**，
> `crypto.randomUUID`、`navigator.clipboard` 等 API 将不可用。本项目已对这两处做了兼容回退
> （`utils.ts` 的 `uid()` 与 `copyToClipboard()`），功能不受影响；但 HTTP 明文会暴露管理员密码
> 与会话令牌，**正式使用务必走 HTTPS**（部署到静态托管，或为 Vite 配置自签证书）。
> `vite.config.ts` 已设置 `server.host: true`，局域网访问本身是通的。

## 五、环境变量

复制 `.env.example` 为 `.env.local` 并填入 Supabase 凭据（**该文件已被 `.gitignore` 忽略，禁止入库**）：

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

> ⚠️ `VITE_SUPABASE_URL` 必须是 **base 地址**：不要带 `/rest/v1/`、不要有结尾斜杠。
> `supabase-js` 会自行拼接 `/rest/v1`，带上会变成 `.../rest/v1//rest/v1/...` 从而 404。

## 六、数据库与权限

### 6.1 表

`posts`（文章）、`projects`（项目），字段与前端类型一一对应，见 `src/types.ts`。

### 6.2 迁移脚本（Supabase → SQL Editor 执行，均幂等可重复运行）

| 脚本 | 作用 |
| --- | --- |
| `supabase/migrations/0001_stage1_admin_base.sql` | 新增 `created_at` / `updated_at` 与索引；建立 `updated_at` 触发器；RLS 收紧为「anon 只读 + authenticated 可写」 |
| `supabase/migrations/0002_stage1_session_validity.sql` | 新增 `is_admin_session_valid()` 函数，写策略要求「会话未超过有效期（默认 7 天）」 |
| `supabase/migrations/0004_stage2_site_profile.sql` | 新建 `site_profile` 单行表 + RLS + 初始化默认值（站点配置云端化） |
| `supabase/migrations/0005_stage2_storage_assets.sql` | 创建 `assets` bucket（public / 5MB / 图片类型）+ Storage 策略（上传删除需会话有效） |

### 6.3 权限模型

| 角色 | 权限 |
| --- | --- |
| **anon**（访客） | **只读** `posts` / `projects`。展示站点与仓库内的保活工作流都依赖它，收紧策略时切勿移除 anon 的 `select` |
| **authenticated**（管理员） | 可读写，但**必须满足会话在有效期内** |

### 6.4 登录有效期（双层校验）

- **服务端（权威，无法绕过）**：`is_admin_session_valid()` 每次请求实时校验，超过期限的会话写入会被 RLS 直接拒绝；
- **客户端（体验）**：`src/auth/AuthProvider.tsx` 的 `SESSION_MAX_AGE_MS`，到期前提醒并主动登出，服务端不可用时回退本地时间戳判断。

> 调整期限需**同时修改两处**：SQL 函数默认值（`0002` 脚本内）与 `SESSION_MAX_AGE_MS`。

## 七、Supabase 控制台配置（首次部署）

1. **Authentication → Sign In / Providers → Email**：启用，并关闭 *Allow new users to sign up*（单管理员）；
2. **Authentication → Users → Add user**：创建管理员账号，并勾选 *Auto Confirm User*；
3. **SQL Editor**：依次执行 `0001`、`0002`、`0004`、`0005` 四个迁移脚本（均幂等）；
4. 验证保活：用 anon key 请求 `{URL}/rest/v1/posts?select=id&limit=1`，应返回 **200**。

> ⚠️ 第 2 步**必须在第 3 步之前**完成：`0001`/`0002` 会把写权限收紧为「登录且会话有效」，之后再用 anon 写入会被 RLS 拒绝。
>
> ⚠️ **密码长度**：后台「修改密码」表单要求 ≥ 6 位（与 Supabase 密码策略一致）。
> 控制台手动 Add user 时不受该限制，因此**别在控制台设置少于 6 位的密码**——那样登录没问题，但之后无法通过后台改回短密码。
>
> 「登录满 N 天强制重新登录」也可通过 Dashboard → **Authentication → Sessions** 的 *Time-box user sessions* 实现，
> 但那是 **Pro 计划**功能；本仓库改用 SQL 函数实现，**免费计划同样有效**。

## 八、目录结构

```
src/
├── main.tsx / App.tsx          入口 / 路由（/ 展示 · /login · /admin）
├── store.tsx                   数据仓库（读取云端 + 本地缓存 + 后台写入同步）
├── theme.ts / toast.tsx / types.ts / utils.ts / styles.css
├── auth/                       AuthProvider（会话与有效期）· ProtectedRoute（路由守卫）
├── components/                 AdminLayout · Header（展示站顶栏/页脚）· Dialog · TagInput ·
│                               LinkRowsEditor · ui（设计系统组件）· icons
├── lib/                        cloud.ts（Supabase 数据与鉴权）· storage.ts（媒体上传）·
│                               markdown.tsx · site.ts（默认值 + 云端合并）
└── pages/
    ├── PublicSite.tsx          展示站点外壳（页内切换）
    ├── HomePage / BlogPage / PostReader / ProjectsPage / AboutPage   展示页（只读）
    ├── LoginPage.tsx           登录页
    ├── PostFormDialog / ProjectFormDialog                            后台表单
    └── admin/                  DashboardPage · PostListPage · ProjectListPage ·
                                AssetsPage（媒体库）· ProfilePage（站点配置）· SettingsPage（导入导出 / 改密码）
supabase/migrations/            数据库迁移脚本
docs/                           需求与交接文档
.github/workflows/              Supabase 保活工作流
```

## 九、部署

> **首次部署顺序**：先在 Supabase SQL Editor 依次执行 `0001` → `0002` → `0004` → `0005`（均幂等），再部署前端。

- 构建产物是纯静态文件，可部署到任意静态托管（Vercel / Cloudflare Pages 等）；
- 展示区为**页内切换**，因此**不需要配置任何 rewrite 规则**；
- 在托管平台配置 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 两个环境变量；
- 后台入口为 `/login`，展示站点不会暴露该链接。

## 十、相关文档

| 文档 | 内容 |
| --- | --- |
| `docs/ADMIN-PANEL-HANDOFF.md` | 原始技术交接（数据模型、可复用组件、设计系统、全部决策） |
| `docs/ADMIN-REQUIREMENTS.md` | 后台开发需求（功能编号、验收标准、风险清单） |
| `docs/REQUIREMENTS.md` | 前台站点原始需求 |
| `docs/ADMIN-STAGE2-REQUIREMENTS.md` | 阶段二开发文档（需求 + 技术选型） |
| `docs/BACKEND-REQUIREMENTS.md` | **后端改造需求**（Java + Spring Boot 版：功能只增不减，新增 8 项后端向能力） |
| `docs/BACKEND-ARCHITECTURE.md` | **后端技术架构**（选型理由、分层、9 项关键机制、12 张表 DDL、接口契约） |
| `docs/BACKEND-PLAN.md` | **后端开发计划**（M0～M6 里程碑、时间档位、答辩演示脚本、砍需求顺序） |

## License

私有项目，版权所有。
