# 罗辑个人主页 · 后台管理系统 · 开发需求文档

| 项目 | 内容 |
| --- | --- |
| 项目代号 | `luoji-admin` |
| 文档版本 | v1.0（草案，待评审） |
| 撰写日期 | 2026-09-10 |
| 文档状态 | Draft / 待确认 |
| 目标产物 | 独立后台管理系统（SPA，与前台 `luoji-home` 共用同一 Supabase 实例） |
| 需求来源 | [`docs/ADMIN-PANEL-HANDOFF.md`](./ADMIN-PANEL-HANDOFF.md)（技术事实基线） |
| 关联前台需求 | [`docs/REQUIREMENTS.md`](./REQUIREMENTS.md) |

> 本文档在交接文档（技术事实）的基础上，整理为**可评审、可验收的开发需求**。
> 功能需求统一编号 `FR-xxx`，每条标注优先级（P0 必须 / P1 应做 / P2 可延后）与验收要点。
> 如有歧义，以本文档为准进行澄清与修订。

---

## 1. 项目背景与目标

### 1.1 背景

前台项目 `luoji-home` 是纯前端 SPA，数据存于 Supabase，**当前没有任何鉴权**：

- 数据库 RLS 为「anon 匿名全量读写」，任何拿到前端 key 的人都能直接改数据；
- 前台页面对所有访客开放「新增 / 编辑 / 删除 / 批量删除」入口。

因此需要一套**独立的后台管理系统**：由管理员登录后进行内容写入，前台退化为纯展示；数据安全由 Supabase Auth + RLS 保证。

### 1.2 目标

1. 提供**登录鉴权**，仅管理员可进入后台并写入数据；
2. 提供文章、项目两类核心内容的**增删改查**能力；
3. 提供 Markdown 编辑与**实时预览**，保证与前台渲染效果一致；
4. 将数据库权限从「anon 全量读写」**收紧为「anon 只读 + authenticated 可写」**；
5. 复用前台既有设计 Token 与组件资产，保持统一的视觉语言。

### 1.3 非目标（本项目不做）

- **不修改前台项目 `luoji-home`**：前台管理按钮在 RLS 收紧后写入失败属**已知预期**，不由本项目修复；
- 不做多管理员 / 角色权限 / 多人协作（单管理员场景）；
- 不做自建后端 / 自建服务端接口（纯前端 + Supabase）；
- 不做服务端 `service_role` 特权操作（不需要，禁止把 secret key 放进前端或 Git）；
- 阶段一不做草稿/发布状态、图片上传、站点配置可视化（见 §10 里程碑，属阶段二，且部分需要前台协同改造）。

---

## 2. 范围边界与强制约束

以下为**不可协商的约束**，实现时必须遵守：

| # | 约束 | 说明 |
| --- | --- | --- |
| C-01 | 前台项目零改动 | `luoji-home` 仓库、代码、部署均不受本项目影响 |
| C-02 | 共用同一 Supabase 实例 | 与前台使用同一组 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` |
| C-03 | 保留 anon 对 `posts` 的 `select` 权限 | 仓库 `supabase-keep-alive.yml` 保活工作流依赖它；收紧 RLS 时必须保留只读策略，否则 Actions 会 401 失败 |
| C-04 | 敏感信息禁止入库 | `.env.local` 已被 `.gitignore` 忽略；`service_role` / secret key 绝不进入前端产物或 Git |
| C-05 | 不破坏既有设计机制 | 设计 Token、根字号阶梯、`Dialog` 的 `createPortal`、`.fade-up` 的定位处理等（见 §8） |
| C-06 | 端口与前台区分 | 开发服务器使用 `5174`（前台为 `5173`），两项目可同时启动 |
| C-07 | 字号使用 rem | 禁止 `text-[15px]` 等固定 px 写法，必须走 §8 的根字号阶梯 |

---

## 3. 目标用户与使用场景

| 角色 | 说明 | 核心诉求 |
| --- | --- | --- |
| 管理员（罗辑本人） | 唯一账号，经 Supabase Auth 登录 | 快速发布/修订文章与项目，操作结果即时同步到前台 |
| 访客 | 不进入后台 | （由前台承接）只读浏览内容 |

主要场景：

1. **发布文章**：登录 → 文章管理 → 新增 → 编辑标题/日期/分类/标签/摘要/正文 → 预览 → 保存 → 前台立即可见；
2. **修订文章**：搜索定位 → 编辑 → 保存；
3. **批量清理**：多选 → 批量删除（二次确认）；
4. **维护项目**：新增/编辑项目，维护技术标签与外链；
5. **状态巡检**：仪表盘查看内容总量、云端连接与同步状态。

---

## 4. 信息架构与路由

引入 `react-router-dom`（**新增依赖**，前台无路由库），采用 `/login` + `/admin/*` 结构：

```
luoji-admin
├── /login                     登录页（未登录访问后台时重定向到此）
└── /admin                     受保护区域（<ProtectedRoute> 包裹）
    ├── /admin                 仪表盘 Dashboard
    ├── /admin/posts           文章列表（搜索 / 排序 / 分页 / 多选批量删除）
    │   ├── /admin/posts/new   新增文章
    │   └── /admin/posts/:id/edit   编辑文章
    ├── /admin/projects        项目列表
    │   ├── /admin/projects/new     新增项目
    │   └── /admin/projects/:id/edit 编辑项目
    ├── /admin/profile         站点配置（阶段二）
    ├── /admin/assets          媒体库 / 图片上传（阶段二）
    └── /admin/settings        账号与系统设置
```

路由规则：

- 未登录访问任意 `/admin/*` → 重定向 `/login`，并记录 `redirect` 参数，登录后跳回；
- 已登录访问 `/login` → 重定向 `/admin`；
- 访问未知路径 → 重定向 `/admin`（或 404 页）。

---

## 5. 功能需求

### 5.1 认证与会话（模块 A）

| 编号 | 优先级 | 需求 | 验收要点 |
| --- | --- | --- | --- |
| FR-A01 | P0 | 邮箱 + 密码登录（Supabase Auth） | 正确凭据进入后台；错误凭据给出明确提示，不泄露账号是否存在 |
| FR-A02 | P0 | 登录态持久化 | 刷新页面 / 关闭重开浏览器后仍保持登录，直到主动登出或会话过期 |
| FR-A03 | P0 | 登出 | 顶栏可登出；登出后清空会话并回到 `/login`，无法通过后退访问受保护页 |
| FR-A04 | P0 | 路由守卫 | 未登录访问 `/admin/*` 一律被拦截重定向；受保护页在会话校验完成前不闪现内容 |
| FR-A05 | P0 | 关闭注册入口 | 后台不提供注册 UI/逻辑；Supabase 控制台关闭公开注册，仅保留唯一管理员账号 |
| FR-A06 | P1 | 会话失效处理 | 登录态过期或 token 失效时，接口报 401 → 提示「登录已过期」并跳转登录页 |
| FR-A07 | P1 | 表单体验 | 密码可见性切换、回车提交、提交中禁用按钮并显示加载态 |
| FR-A08 | P2 | 找回/改密 | 通过 Supabase Auth 邮件重置密码；后台提供「修改密码」入口 |

**实现要点**：

- `lib/cloud.ts` 的 `createClient` 目前为 `auth: { persistSession: false }`（§5 交接文档），
  后台需改为 `persistSession: true`，或为后台建立独立 client；
- 新增 `AuthProvider`（Context）暴露 `session / user / signIn / signOut / loading`，配合 `<ProtectedRoute>`。

### 5.2 全局框架与布局（模块 L）

| 编号 | 优先级 | 需求 | 验收要点 |
| --- | --- | --- | --- |
| FR-L01 | P0 | 布局：左侧固定侧边栏 + 顶部栏 + 右侧内容区 | 侧边栏导航可折叠（窄屏抽屉）；当前路由高亮 |
| FR-L02 | P0 | 顶栏内容 | 管理员邮箱 / 主题切换 / 登出；同步状态指示 |
| FR-L03 | P0 | 主题切换 | 复用现有 `luoji.theme` 机制，明/暗两套均达标 |
| FR-L04 | P0 | 全站响应式 | 桌面优先，窄屏侧边栏收起为抽屉；无横向滚动（1366/1440/1920/2560/手机均验证） |
| FR-L05 | P0 | 三态齐全 | 每个数据页必须实现**加载态 / 空态（`EmptyState`）/ 错误态** |
| FR-L06 | P0 | 破坏性操作二次确认 | 删除、批量删除、登出等使用 `ConfirmDialog` |
| FR-L07 | P0 | 操作反馈 | 增删改成功/失败使用 `useToast()` 提示；失败需可感知且状态一致 |
| FR-L08 | P1 | 页面切换 | 切换 route 时滚动复位；沿用 `.fade-up` 过渡且不破坏 `fixed` 定位机制 |
| FR-L09 | P1 | 无障碍 | 交互元素可聚焦、有焦点环、有 `label`/`aria-label`；键盘可完整操作 |

### 5.3 仪表盘（模块 D）

| 编号 | 优先级 | 需求 | 验收要点 |
| --- | --- | --- | --- |
| FR-D01 | P0 | 内容统计 | 展示文章总数、项目总数 |
| FR-D02 | P0 | 云端连接状态 | 展示 `cloudEnabled` 与 `syncStatus`（local / loading / synced / error） |
| FR-D03 | P0 | 最近更新 | 展示最近更新的内容（**依赖新增 `updated_at` 字段**，见 §6.3；若字段未落地则降级为「按日期排序的最新文章」） |
| FR-D04 | P1 | 快捷入口 | 提供「新增文章」「新增项目」快捷按钮 |
| FR-D05 | P1 | 数据一致性提示 | `syncStatus === 'error'` 时给出醒目提示与重试入口 |

### 5.4 文章管理（模块 P）

| 编号 | 优先级 | 需求 | 验收要点 |
| --- | --- | --- | --- |
| FR-P01 | P0 | 文章列表（**表格形态**，信息密度高于前台卡片） | 列：标题 / 日期 / 分类 / 标签 / 摘要（截断）/ 操作 |
| FR-P02 | P0 | 搜索 | 按标题、分类、标签、正文即时过滤（中文按子串匹配兜底） |
| FR-P03 | P0 | 排序 | 至少支持按日期、按标题排序（升/降） |
| FR-P04 | P0 | 分页 | 列表分页或「加载更多」；数据量大时不卡顿 |
| FR-P05 | P0 | 新增文章 | 复用 `PostFormDialog`，校验规则见 §6.2 |
| FR-P06 | P0 | 编辑文章 | 回填原数据，保留 `id`，保存后 `isSample` 置 `false` |
| FR-P07 | P0 | 删除单篇 | `ConfirmDialog` 二次确认后删除并同步云端 |
| FR-P08 | P0 | 批量删除 | 多选（表头全选 + 行选中）后批量删除，二次确认 |
| FR-P09 | P0 | 空态 / 无搜索结果态 | 无数据展示 `EmptyState`；搜索无结果给出可清除的提示 |
| FR-P10 | P1 | 示例数据标识 | `isSample` 数据展示「示例 · 可删除」标识 |
| FR-P11 | P1 | 行内预览跳转 | 可从列表进入前台阅读页预览（或后台内预览） |
| FR-P12 | P2 | 草稿 / 发布状态 | 见 §6.3 字段扩展；**前台需同步改造才能生效，跨项目协同，默认延后** |
| FR-P13 | P2 | 置顶 / 排序权重 | 需扩展字段，跨项目影响，延后 |

### 5.5 项目管理（模块 J）

| 编号 | 优先级 | 需求 | 验收要点 |
| --- | --- | --- | --- |
| FR-J01 | P0 | 项目列表 | 表格：名称 / 简介 / 技术标签 / 外链数量 / 操作 |
| FR-J02 | P0 | 新增项目 | 复用 `ProjectFormDialog`，校验见 §6.2 |
| FR-J03 | P0 | 编辑项目 | 回填原数据，保留 `id`，`isSample` 置 `false` |
| FR-J04 | P0 | 删除项目 | 二次确认后删除并同步云端 |
| FR-J05 | P0 | 外链管理 | 至少 1 条有效外链；`href` 必须为 `http(s)` 绝对地址 |
| FR-J06 | P1 | 搜索 / 排序 | 按名称、技术标签搜索；按名称排序 |

### 5.6 Markdown 编辑与预览（模块 M）

| 编号 | 优先级 | 需求 | 验收要点 |
| --- | --- | --- | --- |
| FR-M01 | P0 | 编写 / 预览 Tab | 与前台 `PostFormDialog` 一致，预览复用 `MarkdownRenderer` |
| FR-M02 | P0 | 渲染一致性 | 后台预览与前台阅读页对同一 Markdown 渲染结果一致（GFM、代码高亮、表格、任务列表） |
| FR-M03 | P1 | 编辑体验 | 正文等宽字体；`Tab` 键不丢失输入焦点；工具栏可选（加粗/标题/代码块/链接） |
| FR-M04 | P1 | 字数与阅读时长 | 实时统计正文字数、预估阅读时长（复用 `readingMinutes`） |
| FR-M05 | P2 | 编辑器增强 | 图片粘贴/拖拽上传（依赖 §5.8）、全屏模式 |

### 5.7 站点配置（模块 S，阶段二）

| 编号 | 优先级 | 需求 | 验收要点 |
| --- | --- | --- | --- |
| FR-S01 | P2 | `site.ts` 迁至云端 | 新建 `site_profile` 单行表，后台可编辑姓名/定位/简介/GitHub/邮箱/技术栈等 |
| FR-S02 | P2 | 前台读取改造 | **需改前台**，跨项目协同；不做则维持硬编码 |

> 当前 `src/lib/site.ts` 为硬编码（含 2 处 `TODO`：GitHub、邮箱）。迁移改动面较大，明确放入阶段二。

### 5.8 媒体 / 图片上传（模块 U，阶段二）

| 编号 | 优先级 | 需求 | 验收要点 |
| --- | --- | --- | --- |
| FR-U01 | P2 | Supabase Storage `assets` bucket | 后台上传图片，返回可公开访问 URL |
| FR-U02 | P2 | Markdown 图片回填 | 上传后自动插入 `![](url)` 到正文光标处 |
| FR-U03 | P2 | 媒体库管理 | 列表查看/复制链接/删除（删除需检查是否被引用，可选） |

### 5.9 账号与系统设置（模块 T）

| 编号 | 优先级 | 需求 | 验收要点 |
| --- | --- | --- | --- |
| FR-T01 | P1 | 账号信息展示 | 展示当前登录邮箱、最近登录时间（若可得） |
| FR-T02 | P2 | 修改密码 | 通过 Supabase Auth 更新密码 |
| FR-T03 | P2 | 数据导入导出 | 全量 JSON 导出 / 导入（含冲突处理策略） |

---

## 6. 数据模型与字段规范

### 6.1 复用现有模型（阶段一）

阶段一**不改变**现有字段语义，直接复用 `src/types.ts` 的 `Post` / `Project` / `ProjectLink`。
详见交接文档 §3 与 §9（表单字段与校验规则），此处摘要：

- `Post`：`id` / `title` / `date(yyyy-mm-dd)` / `category` / `tags[]` / `description` / `content` / `isSample?`
- `Project`：`id` / `name` / `tagline` / `tech[]` / `links[]` / `isSample?`
- `ProjectLink`：`id` / `label` / `href(http(s) 绝对地址)`

### 6.2 表单校验规则（必须与前台一致）

**文章**：

| 字段 | 控件 | 校验 |
| --- | --- | --- |
| 标题 | `Input` | 非空（`标题不能为空`），`maxLength=80` |
| 日期 | `type=date` | 非空 + 可解析（`日期格式不正确`） |
| 分类 | `Input` | 可选，`maxLength=20` |
| 标签 | `TagInput` | 可选 |
| 摘要 | `Textarea rows=2` | 可选，`maxLength=140` |
| 正文 | `Textarea rows=14`（等宽）+ 编写/预览 | 非空且 `trim().length >= 6` |

**项目**：

| 字段 | 控件 | 校验 |
| --- | --- | --- |
| 项目名称 | `Input` | 非空，`maxLength=60` |
| 一句话简介 | `Textarea rows=2` | 非空，`maxLength=120` |
| 技术标签 | `TagInput` | 可选 |
| 项目外链 | `LinkRowsEditor` | 每行 label + href 齐备；`href` 需 `http(s)://`；至少 1 条有效行 |

> 保存时统一 `trim()` 标题/分类/摘要；新增用 `uid()` 生成 `id` 并置顶；编辑保留原 `id`。

### 6.3 需新增的字段（阶段二，含兼容性约束）

| 表 | 字段 | 类型 | 用途 | 风险 |
| --- | --- | --- | --- | --- |
| `posts` | `status` | `text default 'published'` | 草稿/发布 | **前台 `select('*')` 会读到草稿**，需前台改造为只查 `published`，否则不进阶段一 |
| `posts` | `updated_at` | `timestamptz default now()` | 仪表盘「最近更新」、列表排序 | 兼容；推荐阶段一即加（仅加列，`update` 时由后台写入） |
| `projects` | `updated_at` | `timestamptz default now()` | 同上 | 兼容 |
| `posts` | `pinned` / `sort` | `boolean` / `int` | 置顶、排序权重 | 需前台配合，延后 |
| — | `site_profile`（新表） | 单行配置表 | 站点资料云端化 | 需前台改造，阶段二 |

> **兼容性原则**：新增列对前台 `select('*')` 是安全的（多余字段被忽略）；
> 但**语义变更**（如 `status` 过滤）必须前台配合，禁止后台单方面引入导致前台展示错误的字段。

---

## 7. 云端与权限设计

### 7.1 RLS 收紧（必须在后台可写入前执行）

```sql
-- 移除旧的匿名全量读写策略
drop policy if exists "posts anon all" on public.posts;
drop policy if exists "projects anon all" on public.projects;

-- anon 只读 + authenticated 读写
create policy "posts read" on public.posts
  for select to anon, authenticated using (true);
create policy "posts write" on public.posts
  for all to authenticated using (true) with check (true);

create policy "projects read" on public.projects
  for select to anon, authenticated using (true);
create policy "projects write" on public.projects
  for all to authenticated using (true) with check (true);
```

> ⚠️ **C-03**：必须保留 `to anon` 的 `select` 策略，保活工作流 `posts?select=id&limit=1` 依赖它。

### 7.2 Supabase Auth 配置

- 控制台开启 **Email** 认证方式；**关闭公开注册**（单管理员）；
- 创建一个管理员账号（邮箱 + 密码）；
- 若开启邮箱确认，需确保管理员账号已确认，否则无法登录。

### 7.3 数据访问层改造（`src/lib/cloud.ts`）

| 项 | 现状 | 后台要求 |
| --- | --- | --- |
| `auth.persistSession` | `false` | 改为 `true`（或后台独立 client），否则登录态不保持 |
| 写入 API | `upsertDoc` / `removeDocs` | **直接复用**，写入时携带已登录会话即可通过 RLS |
| 读取 API | `fetchAllData` | 复用；后台可增加排序/分页参数（可选） |
| 错误处理 | `throw error` | 后台需识别 401（会话失效）并触发跳转登录 |

---

## 8. 交互与视觉规范（必须遵守）

### 8.1 设计资产复用

- **颜色 / 主题**：沿用 `src/styles.css` 的 CSS 变量 Token（`--canvas` / `--surface` / `--line` / `--ink` / `--brand` / `--danger` / `--ok` / `--warn` 等），及 `html.dark` 深色机制；
- **组件**：复用 `components/ui.tsx` 的 `Button` / `Input` / `Textarea` / `Field` / `Chip` / `Checkbox` / `EmptyState` / `PageHead` / `IconBtn` / `cn`；
- **其他**：`Dialog` / `ConfirmDialog` / `TagInput` / `LinkRowsEditor` / `useToast` / `MarkdownRenderer` 全部复用；
- 不重做设计、不改配色与字体，引入新组件必须与现有视觉语言一致。

### 8.2 根字号阶梯（大屏等比放大的核心机制）

`rem` 基准随视口放大，**所有字号/间距必须用 rem**：

| 视口宽度 | `:root font-size` | 等效基准 |
| --- | --- | --- |
| < 1024px | 100% | 16px |
| ≥ 1024px | 106.25% | 17px |
| ≥ 1366px | 118.75% | 19px |
| ≥ 1536px | 131.25% | 21px |
| ≥ 1920px | 150% | 24px |
| ≥ 2560px | 175% | 28px |

### 8.3 排版与响应式

- `body` 全局 `font-weight: 500`，标题 `font-bold`；
- 字号禁止固定 px（如 `text-[15px]`），使用 `text-[1.0625rem]` 等 rem 写法；
- 页面级容器流体：`w-full` + `px-4 sm:px-6 lg:px-8 xl:px-10`；内容级容器才用 `max-w-*`；
- 表格 / 代码块用 `overflow-x: auto` 局部滚动；视口严禁横向滚动。

### 8.4 不可破坏的既有机制

- `Dialog` 用 `createPortal` 挂到 `document.body`，避免祖先 `transform` 劫持 `fixed`；
- `.fade-up` 故意不写 `animation-fill-mode: both`，否则会成为内部 `fixed` 元素的包含块；
- `.dialog-panel` 限高 `calc(100vh - 2rem)`；输入框布局加 `min-w-0`。

---

## 9. 非功能需求

| 类别 | 要求 |
| --- | --- |
| 性能 | 后台首屏可接受（无重型依赖）；列表虚拟化/分页避免大表卡顿；Markdown 预览不阻塞输入 |
| 安全 | RLS 收紧；会话持久化 + 失效处理；不引入 secret key；外链 `rel="noopener noreferrer"` |
| 可用性 | 三态齐全（加载/空/错误）；破坏性操作二次确认；操作结果 Toast 反馈 |
| 可访问性 | 语义化标签、焦点环、键盘可操作、对比度达标、图标按钮有 `label` |
| 可维护性 | 数据访问与 UI 分离；复用组件不复制粘贴；常量集中管理 |
| 兼容性 | 最新两版 Chrome / Edge / Safari / Firefox；桌面优先并向下适配移动端 |
| 一致性 | 与前台共用同一数据库与同一套设计 Token，渲染结果一致 |

---

## 10. 里程碑与交付排期（建议）

| 阶段 | 内容 | 验收标准 |
| --- | --- | --- |
| **M0 初始化**（已完成） | 复制项目、改名、环境变量、端口 5174、远端指向 | `npm run dev` 可独立启动 |
| **M1 认证与骨架** | `react-router-dom`、`AuthProvider`、`ProtectedRoute`、登录页、后台布局（侧边栏+顶栏）、RLS 收紧 | 未登录被拦截；登录后进入后台；anon 仍可读 posts（保活通过） |
| **M2 文章管理** | 列表（表格/搜索/排序/分页/多选）+ 新增/编辑/删除/批量删除、Markdown 预览 | 前台能读到后台写入的数据；全流程校验通过 |
| **M3 项目管理** | 列表 + 新增/编辑/删除 + 外链管理 | 项目卡片与链接在前台正确展示 |
| **M4 仪表盘与收尾** | 统计、同步状态、错误态、空态、响应式与 a11y 自查 | 验收标准 §11 全部通过 |
| **M5 阶段二（可选）** | 草稿/发布、图片上传、站点配置、导入导出 | 视前台协同改造安排 |

---

## 11. 验收标准（DoD 摘要）

1. 未登录访问 `/admin/*` 一律被拦截并跳转登录；登录态刷新后保持；登出后无法回退访问；
2. 后台新增/编辑的文章与项目，**在前台刷新后立即可见**且渲染一致；
3. 文章管理支持搜索、排序、分页、多选批量删除，均有二次确认与结果提示；
4. 项目外链校验生效（至少 1 条，`http(s)` 绝对地址），无效时不可保存；
5. RLS 已收紧为「anon 只读 + authenticated 可写」，且 `supabase-keep-alive.yml` 仍能成功执行；
6. 明/暗主题、五档视口宽度（含手机）下无横向滚动、无布局错乱；字号随根字号阶梯等比放大；
7. 所有数据页具备加载态 / 空态 / 错误态；破坏性操作均有二次确认；
8. 控制台无报错，`npm run build` / `npm run typecheck` 通过；无遗留 `TODO` 占位与 emoji 图标滥用。

---

## 12. 关键假设与待确认问题

1. **单管理员模式**：确认仅一个管理员账号、后台不提供注册；如需多账号需追加角色设计；
2. **RLS 收紧的取舍**：确认选择「路线 B（收紧 RLS）」，接受前台管理按钮失效（已知预期）；
3. **阶段一是否引入 `updated_at`**：仪表盘「最近更新」需要它；若不加列，FR-D03 降级为「按 `date` 排序的最新文章」；
4. **阶段二字段（`status` / `pinned` / `site_profile`）是否需要前台协同改造**：需与前台项目排期确认后再动；
5. **会话策略**：是否需要「记住我 / 会话时长」配置；Supabase 默认会话时长是否满足；
6. **是否需要服务端能力**：当前方案纯前端 + Auth，无需 secret key；若未来要管理用户或定时任务，需另立服务端方案。

---

## 13. 风险清单

| # | 风险 | 影响 | 应对 |
| --- | --- | --- | --- |
| R-01 | RLS 收紧后前台管理按钮写入失败 | 前台出现「云端同步失败」、刷新回滚 | 已知预期；后续重新部署前台时顺手隐藏按钮 |
| R-02 | 误删保活所需的 anon `select` 权限 | GitHub Actions 保活任务 401 失败 | 收紧 SQL 中显式保留 `to anon` 的 `select` |
| R-03 | `persistSession: false` 未改 | 登录态不保持，频繁掉线 | M1 明确改造 `cloud.ts` 或建独立 client |
| R-04 | 新增 `status` 等语义字段未同步前台 | 前台展示草稿内容 | 阶段二字段必须前台协同，禁止后台单方面引入 |
| R-05 | 新增字段与前台 `select('*')` 类型断言冲突 | 前台出现未知字段（一般无害） | 仅新增列、不改语义；必要时前台补类型 |
| R-06 | 批量删除 / 大列表性能 | 页面卡顿 | 分页 + 按需渲染；删除用 `in('id', ids)` 单批请求 |
| R-07 | 固定 px 字号破坏大屏尺度 | 大屏字不放大，视觉不一致 | 强制 rem 规范，评审时逐项检查 |
| R-08 | 破坏 `.fade-up` / `Dialog` 既有机制 | 弹窗定位错乱 | 复用组件时不改其实现 |
| R-09 | 环境变量 / secret 误入库 | 数据安全 | `.env.local` 已忽略；永不提交 secret key |

---

## 14. 附录

### 14.1 新增依赖

| 依赖 | 用途 | 备注 |
| --- | --- | --- |
| `react-router-dom` | 路由与守卫 | 前台无路由库，本项目新增 |

### 14.2 建议目录结构

```
src/
├── main.tsx                    # 入口：RouterProvider + AuthProvider + StoreProvider + ToastProvider
├── App.tsx                     # 路由表 + 布局
├── auth/
│   └── AuthProvider.tsx        # 会话状态 + signIn/signOut
├── components/
│   ├── ProtectedRoute.tsx      # 路由守卫
│   ├── AdminLayout.tsx         # 侧边栏 + 顶栏 + 内容区
│   └── ...（复用现有 ui / Dialog / TagInput / LinkRowsEditor）
├── pages/
│   ├── LoginPage.tsx
│   ├── admin/
│   │   ├── DashboardPage.tsx
│   │   ├── PostListPage.tsx
│   │   ├── ProjectListPage.tsx
│   │   ├── ProfilePage.tsx     # 阶段二
│   │   ├── AssetsPage.tsx      # 阶段二
│   │   └── SettingsPage.tsx
│   └── ...（复用 PostFormDialog / ProjectFormDialog）
├── lib/
│   ├── cloud.ts                # 改造 persistSession
│   └── markdown.tsx            # 复用
└── store.tsx                   # 复用（可按需扩展）
```

### 14.3 可复用清单速查

| 资产 | 位置 | 用途 |
| --- | --- | --- |
| `Button` / `Input` / `Textarea` / `Field` / `Chip` / `Checkbox` / `EmptyState` / `PageHead` / `IconBtn` / `cn` | `components/ui.tsx` | 基础 UI |
| `Dialog` / `ConfirmDialog` | `components/Dialog.tsx` | 弹窗 / 二次确认 |
| `TagInput` | `components/TagInput.tsx` | 标签输入 |
| `LinkRowsEditor` | `components/LinkRowsEditor.tsx` | 项目外链编辑 |
| `useToast` | `toast.tsx` | 轻提示 |
| `MarkdownRenderer` | `lib/markdown.tsx` | 预览 / 渲染 |
| `PostFormDialog` / `ProjectFormDialog` | `pages/` | 文章 / 项目表单 |
| `upsertDoc` / `removeDocs` / `fetchAllData` | `lib/cloud.ts` | 云端读写 |
| `uid` / `todayISO` / `fmtDate` / `isValidHttpUrl` / `readingMinutes` | `utils.ts` | 工具函数 |
| 设计 Token | `styles.css` | 配色 / 主题 |

---

*（本文档将随评审意见修订，各节修订后更新版本号并记录变更。）*
