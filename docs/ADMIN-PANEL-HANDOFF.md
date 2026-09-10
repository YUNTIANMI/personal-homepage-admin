# 后台管理系统 · 开发交接信息

> **用途**：在新对话中开发「个人网站后台管理系统」时，请把本文件作为上下文提供给 AI。
> 本文件描述**现有前台项目的完整技术事实**，以及开发后台前必须先确定的事项。

---

## 0. 一句话需求

**复制现有项目出一个独立新项目**，在其上开发后台管理系统。

- 现有前台项目 `luoji-home` **保持现状、独立可运行，不做任何修改**；
- 后台系统 = 把现有项目**复制一份**作为新项目（建议目录 `personal-homepage-admin`），所有改动只发生在副本；
- 两个项目**共用同一个 Supabase 实例**：后台负责写入，前台负责展示；
- 后台需包含登录鉴权 + 文章 / 项目 / 站点配置管理能力。

> 复制与初始化步骤见 **§13**。

---

## 1. 现有项目速览

| 项 | 值 |
| --- | --- |
| 项目名 | `luoji-home`（罗辑个人主页） |
| 本地路径 | `e:\WORK\personal homepage` |
| GitHub | `https://github.com/YUNTIANMI/personal-homepage.git`（分支 `main`） |
| 定位 | 软件工程方向个人博客与作品集（纯前端 SPA，无自建后端） |
| 数据存储 | Supabase（云）为主，localStorage 作离线缓存兜底 |
| 当前状态 | 前台功能完整、云端已打通、已推送 GitHub；**部署到静态托管尚未开始** |

### 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | React 18.3 + TypeScript 5.7 |
| 构建 | Vite 6（`@vitejs/plugin-react`） |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite`）+ CSS 变量设计 Token |
| 数据库 | Supabase（`@supabase/supabase-js` ^2.116，前端直连 + RLS） |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| 图标 | `lucide-react`（全部线性图标，禁止 emoji 当图标） |
| 状态 | React `useReducer` + Context（**无 Redux / React Router / 状态库**） |
| 路由 | 无路由库，用 `useState<View>` 切换视图 |

### 命令与入口

```bash
npm install          # 安装依赖（Node ≥ 18）
npm run dev          # 开发服务器 → http://localhost:5173（HMR）
npm run build        # tsc --noEmit + vite build → dist/
npm run preview      # 预览构建产物 → http://localhost:4173
npm run typecheck    # 仅类型检查
```

### 环境变量

`.env.local`（**已被 `.gitignore` 忽略，禁止入库**）：

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

> ⚠️ **URL 必须是 base 地址**：不要带 `/rest/v1/`、不要有结尾斜杠。
> `supabase-js` 会自行拼接 `/rest/v1`，带了会变成 `.../rest/v1//rest/v1/...` 而 404。
> 模板见仓库 `.env.example`。

---

## 2. 目录结构（真实）

```
personal homepage/
├── index.html                    # HTML 入口 + 主题防闪烁初始化脚本（localStorage: luoji.theme）
├── vite.config.ts                # plugins: react() + tailwindcss(); server.host: true, port: 5173
├── tsconfig.json
├── package.json
├── README.md                     # 使用说明（含 Supabase 建表 SQL 与部署指引）
├── 文案修改指南.md               # 站内文案修改位置索引
├── .env.example                  # 环境变量模板
├── .github/workflows/
│   └── supabase-keep-alive.yml   # 每 5 天 ping 一次 Supabase，防免费项目暂停
├── docs/
│   ├── REQUIREMENTS.md           # 原始需求与设计基线
│   └── ADMIN-PANEL-HANDOFF.md    # 本文件
└── src/
    ├── main.tsx                  # 入口：StoreProvider + ToastProvider
    ├── App.tsx                   # 布局（Header/Main/Footer）+ 视图切换 + 主题切换
    ├── styles.css               # ★ 设计 Token、根字号阶梯、Markdown 排版、语法高亮
    ├── types.ts                  # Post / Project / ProjectLink / View
    ├── store.tsx                 # ★ 数据仓库（内存 state + 云端同步 + localStorage 缓存）
    ├── toast.tsx                 # 轻提示（useToast）
    ├── utils.ts                  # uid / todayISO / fmtDate / isValidHttpUrl / readingMinutes
    ├── lib/
    │   ├── site.ts               # ★ 站点个人资料（硬编码，后台若要管理需改造）
    │   ├── cloud.ts              # ★ Supabase 数据访问层
    │   └── markdown.tsx          # MarkdownRenderer 渲染管线
    ├── components/
    │   ├── Header.tsx            # 顶部导航 + Footer（含云端同步状态显示）
    │   ├── Dialog.tsx            # Dialog（size: md|lg|xl）+ ConfirmDialog
    │   ├── ui.tsx                # ★ Button / Input / Textarea / Field / Chip / Checkbox / EmptyState / PageHead / IconBtn / cn
    │   ├── TagInput.tsx          # 标签输入（回车 / 逗号添加，× 删除）
    │   ├── LinkRowsEditor.tsx    # 项目外链多行编辑器
    │   └── icons.tsx             # BrandLogo / GithubIcon 等自定义图标
    └── pages/
        ├── HomePage.tsx          # 首页（Hero + 站点数据卡）
        ├── BlogPage.tsx          # 文章列表（搜索 / 勾选 / 批量删除 / 行内操作）
        ├── PostReader.tsx        # Markdown 阅读页
        ├── ProjectsPage.tsx      # 项目卡片网格
        ├── AboutPage.tsx         # 关于页
        ├── PostFormDialog.tsx    # 文章新增 / 编辑表单
        └── ProjectFormDialog.tsx # 项目新增 / 编辑表单
```

---

## 3. 数据模型（`src/types.ts`）

### Post（文章）

| 字段 | 类型 | 必填 | 约束 / 说明 |
| --- | --- | --- | --- |
| `id` | `string` | ✅ | `uid()` 生成（`crypto.randomUUID()`），**主键** |
| `title` | `string` | ✅ | 非空，表单 `maxLength=80` |
| `date` | `string` | ✅ | `yyyy-mm-dd`（`todayISO()` 生成） |
| `category` | `string` | ➖ | 表单 `maxLength=20` |
| `tags` | `string[]` | ➖ | 云端存 `jsonb` |
| `description` | `string` | ➖ | 摘要，`maxLength=140`；留空时列表自动截取正文开头 90 字 |
| `content` | `string` | ✅ | Markdown 正文，`trim().length >= 6` |
| `isSample` | `boolean?` | ➖ | 内置示例标记（页面上显示「示例 · 可删除」）；**被编辑后自动置 `false`** |

### Project（项目）

| 字段 | 类型 | 必填 | 约束 / 说明 |
| --- | --- | --- | --- |
| `id` | `string` | ✅ | 主键 |
| `name` | `string` | ✅ | `maxLength=60` |
| `tagline` | `string` | ✅ | 一句话简介，`maxLength=120` |
| `tech` | `string[]` | ➖ | 技术标签，`jsonb` |
| `links` | `ProjectLink[]` | ✅ | **至少 1 条有效外链**，`jsonb` |
| `isSample` | `boolean?` | ➖ | 同上 |

### ProjectLink

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 行内唯一 id |
| `label` | `string` | 按钮文案（如 `GitHub`、`在线 Demo`） |
| `href` | `string` | **必须是 http(s) 绝对地址**（`isValidHttpUrl` 校验） |

### View

```ts
type View = 'home' | 'blog' | 'read' | 'projects' | 'about'
```

> 当前无路由库，`App.tsx` 用 `useState<View>` + `readId` 控制页面。后台若做成同仓库子应用，需要引入路由（推荐 `react-router-dom`）。

---

## 4. 云端数据库（Supabase）

### 表结构（已在线上创建）

```sql
-- 文章表
create table if not exists public.posts (
  id text primary key,
  title text not null default '',
  date text default '',
  category text default '',
  tags jsonb not null default '[]'::jsonb,
  description text default '',
  content text default '',
  "isSample" boolean not null default false
);

-- 项目表
create table if not exists public.projects (
  id text primary key,
  name text not null default '',
  tagline text default '',
  tech jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  "isSample" boolean not null default false
);

alter table public.posts enable row level security;
alter table public.projects enable row level security;

-- ⚠️ 当前策略：匿名用户可全量读写（个人站点临时方案）
create policy "posts anon all" on public.posts
  for all to anon using (true) with check (true);
create policy "projects anon all" on public.projects
  for all to anon using (true) with check (true);
```

### ⚠️ 后台开发的第一个安全问题

**当前 RLS 是「anon 全量读写」**：任何拿到 `.env.local` 里那个 key 的人都**可以直接改你的数据**。前台把管理按钮暴露给所有访客（博客页右上角「新增文章」）。

做后台时必须一并处理：

1. 前台**移除**所有增删改入口（只读展示）；
2. 后台接入 **Supabase Auth**（邮箱 + 密码，或 magic link）；
3. 把 RLS 收紧为「**anon 只读、authenticated 可写**」：

```sql
-- 建议方向（后台开发时执行）
drop policy if exists "posts anon all" on public.posts;
drop policy if exists "projects anon all" on public.projects;

create policy "posts read" on public.posts for select to anon, authenticated using (true);
create policy "posts write" on public.posts for all to authenticated using (true) with check (true);

create policy "projects read" on public.projects for select to anon, authenticated using (true);
create policy "projects write" on public.projects for all to authenticated using (true) with check (true);
```

> `.github/workflows/supabase-keep-alive.yml` 里的保活请求使用 anon key + 查询 `posts?select=id&limit=1`，
> **收紧 RLS 后必须保留 anon 的 `select` 权限**，否则保活会返回 401，GitHub Actions 会失败。

### API Key 类型说明

- 现在用的是 Supabase **新版 publishable key**（`sb_publishable_...`），设计上可公开（会打进前端产物）。
- 若后台需要**服务端特权操作**（绕过 RLS、管理用户），才使用 `service_role` / secret key —— 它**绝不能出现在前端代码或 Git 中**，只能放在服务端环境变量里（如 Vercel Serverless / Edge Function）。
- 纯前端后台 + Supabase Auth 方案下，**不需要** secret key。

---

## 5. 数据访问层（`src/lib/cloud.ts`，可直接复用）

```ts
cloudEnabled: boolean                                   // 是否配置了环境变量
COLLECTIONS: { posts: 'posts', projects: 'projects' }   // 表名常量
type CollectionName = 'posts' | 'projects'

getClient(): SupabaseClient                             // 单例（auth.persistSession: false）

fetchAllData(): Promise<{ posts: Post[]; projects: Project[] }>

upsertDoc(collection: CollectionName, doc: Post | Project): Promise<void>
// 按业务 id upsert（onConflict: 'id'），新增与更新共用

removeDocs(collection: CollectionName, ids: string[]): Promise<void>
// 按 id 批量删除（ids 为空时直接返回）
```

> 后台做认证后，这里的 `persistSession` 需要改成 `true`（或使用独立 client），否则登录态不保持。

---

## 6. 状态层（`src/store.tsx`）

```ts
interface StoreValue {
  posts: Post[]
  projects: Project[]
  dispatch: Dispatch<Action>
  cloudEnabled: boolean
  syncStatus: 'local' | 'loading' | 'synced' | 'error'
}

type Action =
  | { type: 'post/add'; post: Post }
  | { type: 'post/update'; post: Post }
  | { type: 'post/delete'; ids: string[] }
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; project: Project }
  | { type: 'project/delete'; ids: string[] }
  | { type: 'state/replace'; posts: Post[]; projects: Project[] }  // 初始化拉取专用，不回写
```

行为要点：

- **乐观更新**：`dispatch` 先改本地内存（界面立即响应），再异步写云端；失败时 `syncStatus = 'error'` 并回退到本地缓存。
- **启动流程**：有 localStorage 缓存 → 先用缓存渲染 → 云端拉取成功后整体覆盖；无缓存且启用云端 → 返回空（**不会把示例数据写进云**）。
- **首次启用云端的迁移**：若云端为空而本地有数据，自动把本地数据上传。
- localStorage 键名：`luoji.store.v1`；主题键：`luoji.theme`。

---

## 7. 可复用 UI 资产

### `src/components/ui.tsx`

| 导出 | 签名要点 |
| --- | --- |
| `cn(...xs)` | 类名拼接（过滤 falsy） |
| `Button` | `variant: primary \| outline \| ghost \| brand-ghost \| danger \| danger-ghost`；`size: sm \| md` |
| `IconBtn` | 图标按钮，`size-9`，需传 `label`（同时作为 `title` 与 `aria-label`） |
| `Input` / `Textarea` | 内置 `inputCls`：`h-11`、`text-[15px]`、`input-base` |
| `inputCls` | 需自定义输入框时直接使用该类名 |
| `Field` | 表单行：`label` / `required`（带红星）/ `error` / `hint` |
| `Chip` | `tone: neutral \| brand \| ok \| warn`，可选 `onRemove` |
| `Checkbox` | `checked` / `onChange` / `label` |
| `EmptyState` | 空态卡片：`icon` / `title` / `desc` / `action` |
| `PageHead` | 页面标题：`kicker` / `title` / `desc` / `actions` |

### 其他组件

| 组件 | 文件 | Props |
| --- | --- | --- |
| `Dialog` | `components/Dialog.tsx` | `open` / `onClose` / `title` / `subtitle` / `size: 'md' \| 'lg' \| 'xl'`（`max-w-md / 2xl / 3xl`） |
| `ConfirmDialog` | 同上 | `open` / `title` / `message` / `confirmText` / `onCancel` / `onConfirm` |
| `TagInput` | `components/TagInput.tsx` | `value: string[]` / `onChange` / `placeholder` |
| `LinkRowsEditor` | `components/LinkRowsEditor.tsx` | `links` / `onChange` / `errors` / `containerError` |
| `useToast()` | `toast.tsx` | `success(msg)` / `danger(msg)` / `info(msg)` |
| `MarkdownRenderer` | `lib/markdown.tsx` | `content` / `className` |

> `Dialog` 用 `createPortal` 挂到 `document.body`，避免被祖先 `transform` / 动画创建「包含块」而劫持 `fixed` 定位。后台复用弹窗时**不要破坏这个机制**。

---

## 8. 设计系统（必须遵守，保持视觉一致）

### 颜色 Token（`src/styles.css`，`@theme inline` 映射为 Tailwind 类）

| CSS 变量 | Tailwind 类 | 浅色值 | 深色值 |
| --- | --- | --- | --- |
| `--canvas` | `bg-canvas` | `#f7f8fa` | `#0a0f16` |
| `--canvas-soft` | `bg-canvas-soft` | `#eef1f5` | `#0f1620` |
| `--surface` | `bg-surface` | `#ffffff` | `#111a26` |
| `--line` | `border-line` | `#e3e8ee` | `#1e2a3a` |
| `--line-strong` | `border-line-strong` | `#cdd6e0` | `#2c3b50` |
| `--ink` | `text-ink` | `#111827` | `#e6edf3` |
| `--ink-soft` | `text-ink-soft` | `#4b5563` | `#aab6c5` |
| `--ink-faint` | `text-ink-faint` | `#7d8b99` | `#6f7d8f` |
| `--brand` | `bg-brand` / `text-brand` | `#2563eb` | `#5b8def` |
| `--brand-strong` | `bg-brand-strong` | `#1d4ed8` | `#8ab0f6` |
| `--brand-soft` | `bg-brand-soft` | `#eaf1fe` | `#14233b` |
| `--danger` / `--danger-soft` | `text-danger` 等 | `#dc2626` / `#fdecec` | `#f87171` / `#34191c` |
| `--ok` / `--ok-soft` | — | `#059669` / `#e5f6ef` | `#34d399` / `#123227` |
| `--warn` / `--warn-soft` | — | `#b45309` / `#fdf3e4` | `#fbbf24` / `#362a12` |

深色主题靠 `html.dark`（`@custom-variant dark`），切换按钮在 `Header`，状态存 `localStorage['luoji.theme']`。

### 字体

```css
--font-sans: 'Inter', 'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', ui-sans-serif, system-ui, ...;
--font-mono: 'JetBrains Mono', 'Cascadia Code', 'SF Mono', Consolas, ...;
```

### ★ 根字号阶梯（桌面端视觉尺度的核心机制）

`rem` 基准随视口放大，**所有字号/间距必须用 rem 单位**，这样大屏才等比放大：

| 视口宽度 | `:root font-size` | 等效基准 |
| --- | --- | --- |
| < 1024px | 100% | 16px |
| ≥ 1024px | 106.25% | 17px |
| ≥ 1366px | 118.75% | 19px |
| ≥ 1536px | 131.25% | 21px |
| ≥ 1920px | 150% | 24px |
| ≥ 2560px | 175% | 28px |

### 排版与字重规范（用户明确要求过）

- `body` 全局 `font-weight: 500`（**不要细体 400**）；
- 标题 `font-bold`（700），正文 ≥ 500；
- Markdown 正文 `.md`：`font-size: 1.125rem`、`line-height: 1.85`、`font-weight: 500`；
- 正文用 `text-[1.0625rem]` 这类 **rem 写法**，**禁止 `text-[15px]` / `text-[13px]` 固定 px**（会导致大屏不放大，此前踩过坑）；
- `PageHead` 标题：`text-[clamp(1.75rem,2vw+0.6rem,2.5rem)]`；
- 首页 Hero 标题：`text-[clamp(2.5rem,3.2vw+1rem,4rem)]`。

### 响应式规范（用户强要求）

- **页面级容器流体**：`w-full` + `px-4 sm:px-6 lg:px-8 xl:px-10`，**不要** `max-w-6xl` 这类锁宽；
- **内容级容器**才用 `max-w-*`；文章正文可保留行宽限制（当前 `max-w-4xl`）；
- 卡片网格随屏增列：项目 `sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`；博客列表 `lg:grid-cols-2`；
- 表格、代码块用 `overflow-x: auto` 局部滚动；
- `body` 有 `overflow-x: clip` 兜底，但**不要依赖它掩盖真实溢出**；
- 视口严禁横向滚动（1366 / 1440 / 1920 / 2560 / 手机均需验证）。

### 动画与定位坑（已在代码注释中说明，勿破坏）

- `.fade-up` **故意不写 `animation-fill-mode: both`**：否则动画结束后元素保留 `transform`，会成为内部 `fixed` 元素的包含块，劫持弹窗定位；
- 弹窗面板用 `.dialog-panel` 限高（`max-height: calc(100vh - 2rem)`），保证窗口很矮时也能滚到底部按钮；
- 输入框布局记得加 `min-w-0`（flex 子元素不收缩会溢出）。

---

## 9. 现有表单字段与校验规则（后台可直接复用）

### 文章（`PostFormDialog.tsx`）

| 字段 | 控件 | 校验 |
| --- | --- | --- |
| 标题 | `Input` | 非空（`标题不能为空`），`maxLength=80` |
| 日期 | `type="date"` | 非空 + 可解析（`日期格式不正确`） |
| 分类 | `Input` | 可选，`maxLength=20` |
| 标签 | `TagInput` | 可选 |
| 摘要 | `Textarea rows=2` | 可选，`maxLength=140` |
| 正文 | `Textarea rows=14`（等宽字体）+「编写 / 预览」Tab | 非空且 `trim().length >= 6` |

保存时 `trim()` 标题 / 分类 / 摘要；新增用 `uid()` 生成 id 并置顶；编辑保留原 id、`isSample` 置 `false`。

### 项目（`ProjectFormDialog.tsx`）

| 字段 | 控件 | 校验 |
| --- | --- | --- |
| 项目名称 | `Input` | 非空，`maxLength=60` |
| 一句话简介 | `Textarea rows=2` | 非空，`maxLength=120` |
| 技术标签 | `TagInput` | 可选 |
| 项目外链 | `LinkRowsEditor` | 每行 label + href 都要有；href 需 `http(s)://`；**至少 1 条有效行** |

---

## 10. 后台管理系统设计要点

### 10.1 开发前必须先确定的决策项

| # | 决策 | 建议 |
| --- | --- | --- |
| 1 | **形态**：同仓库子路由 `/admin` vs 独立项目 | ✅ **已决定：独立项目**（复制现有项目后在新副本上开发，前台项目保持不动）。做法见 §13 |
| 2 | **认证方式** | 推荐 **Supabase Auth（邮箱 + 密码）**；纯前端即可，无需自建后端。单管理员场景也可用「Supabase Auth 单账号 + 关闭注册」 |
| 3 | **RLS 策略** | 必须从「anon 全量读写」改为「anon 只读 + authenticated 可写」（见 §4 的 SQL） |
| 4 | **前台改造范围** | 移除博客页「新增/编辑/删除/批量删除」、项目页增删改入口，前台变纯展示 |
| 5 | **站点配置**：`lib/site.ts` 目前是**硬编码** | 若要后台可编辑，需新建 `site_profile` 单行表，把 `SITE` 迁到云端（改动面较大，可放到第二阶段） |
| 6 | **图片上传**：当前无图片能力 | 用 **Supabase Storage** 建 `assets` bucket，后台提供上传并回填 Markdown 图片链接 |
| 7 | **路由方案** | 引入 `react-router-dom`，`/` 前台、`/admin/*` 后台，用 `<ProtectedRoute>` 包裹 |

### 10.2 建议的后台功能清单

**MVP（第一阶段）**

- 登录 / 登出（Supabase Auth，会话持久化）
- 仪表盘：文章数、项目数、最近更新时间、云端连接状态
- 文章管理：列表（搜索 / 排序 / 分页）+ 新增 / 编辑 / 删除 / 批量删除（复用 `PostFormDialog`）
- 项目管理：列表 + 新增 / 编辑 / 删除（复用 `ProjectFormDialog`）
- Markdown 编辑器带实时预览（复用 `MarkdownRenderer`）

**进阶（第二阶段）**

- 草稿 / 发布状态（需给 `posts` 加 `status` 字段，前台只查 `published`）
- 图片上传（Supabase Storage）
- 站点配置可视化编辑（`site.ts` 迁表）
- 标签 / 分类管理、文章置顶
- 操作日志、软删除 / 回收站
- 数据导入导出（JSON）

### 10.3 后台 UI 建议

- 沿用现有设计 Token 与 `ui.tsx` 组件，保持同一套视觉语言；
- 布局建议：左侧固定侧边栏（导航）+ 顶部条（管理员邮箱 / 主题切换 / 登出）+ 右侧内容区；
- 表格类管理页优先用**表格**而非卡片列表（后台信息密度应高于前台）；
- 必须有：加载态、空态（`EmptyState`）、错误态（`syncStatus === 'error'` 提示）、破坏性操作二次确认（`ConfirmDialog`）；
- 桌面端视觉尺度同样遵循 §8 的根字号阶梯与 rem 规范。

---

## 11. 待办与已知事项

- [ ] `src/lib/site.ts` 中 GitHub / 邮箱仍带 `TODO` 注释，需确认是否为最终信息；
- [ ] 站点**尚未部署**到静态托管（Vercel / Cloudflare Pages 等）；部署时需在该平台配置 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`；
- [ ] GitHub Secrets 里的 `SUPABASE_URL` 目前带 `/rest/v1/` 后缀（工作流已做容错），建议改为规范 base 地址；
- [ ] 前台目前对所有访客开放内容管理按钮 —— 后台完成后应移除；
- [ ] RLS 当前为匿名全量读写 —— 后台必须收紧。

---

## 12. 新对话开场白模板（可直接复制）

```
请基于现有项目开发后台管理系统，项目交接信息见 docs/ADMIN-PANEL-HANDOFF.md（请先完整阅读）。

我的决定：
1. 形态：同仓库 /admin 子路由（引入 react-router-dom）
2. 认证：Supabase Auth（邮箱 + 密码，单管理员）
3. 前台改造：移除所有增删改入口，改为纯展示；RLS 收紧为 anon 只读 / authenticated 可写
4. 第一阶段范围：登录 + 仪表盘 + 文章管理（增删改查/搜索/批量删除）+ 项目管理 + Markdown 编辑预览
5. 视觉：完全复用现有设计 Token 与 components/ui.tsx，保持一致的视觉语言，桌面端遵循根字号阶梯规范
6. 约束：不重做前台设计，不改现有配色与字体，不破坏现有响应式规则

请先给出实施计划（文件改动清单 + 数据与 RLS 变更 + 风险点），确认后再动手写代码。
```

---

## 13. 项目复制与初始化（已决定方案）

### 13.1 为什么用 `git clone` 而不是手动复制文件夹

`git clone` 只复制**被 Git 跟踪的文件**，自动排除 `node_modules/`、`dist/`、`.env.local`、`.codebuddy/` 等噪音，
既干净又能带走完整历史；手动复制文件夹会把这些一起搬走（几百 MB，且容易与前台项目混淆）。

### 13.2 复制步骤

```powershell
# 1) 从本地仓库克隆出干净副本（在 e:\WORK 下执行）
cd e:\WORK
git clone "e:\WORK\personal homepage" personal-homepage-admin

# 2) 安装依赖
cd personal-homepage-admin
npm install

# 3) 补回环境变量（.env.local 被 .gitignore 忽略，不会随克隆过来）
#    后台要连同一个 Supabase 实例，把前台那份复制过来即可
Copy-Item "e:\WORK\personal homepage\.env.local" .\.env.local

# 4) 确认副本可独立运行
npm run dev
```

### 13.3 复制后必须修改的 4 处

| 位置 | 改什么 |
| --- | --- |
| `package.json` | `"name": "luoji-home"` → `"luoji-admin"`；`"description"` 改为后台说明 |
| `index.html` | `<title>` 与 `<meta name="description">` |
| `README.md` | 重写为后台项目说明（运行方式、环境变量、认证配置） |
| Git 远端 | 指向新仓库；或清空历史后重新 `git init`（二选一见 13.4） |

### 13.4 Git 历史处理（二选一）

**A. 保留历史 + 换远端**（推荐，可追溯来源）

```powershell
# 先在 GitHub 新建空仓库（不要勾选 README / .gitignore），然后：
git remote set-url origin https://github.com/YUNTIANMI/<新仓库名>.git
git push -u origin main
```

**B. 全新历史**（干净的第一条提交）

```powershell
Remove-Item -Recurse -Force .git   # ⚠️ 只作用于副本，绝不要在前台项目里执行
git init -b main
git add -A
git -c user.name=YUNTIANMI -c user.email=YUNTIANMI@users.noreply.github.com commit -m "chore: 基于 luoji-home 初始化后台管理系统"
git remote add origin https://github.com/YUNTIANMI/<新仓库名>.git
git push -u origin main
```

> ⚠️ **前台项目与原仓库 `personal-homepage` 保持不动**：后续所有后台相关提交只推送到新仓库，
> 不要向前台仓库推送后台代码，避免两个项目互相污染。

### 13.5 与前台共用 Supabase 的注意事项

- 两个项目**共用**同一组 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`（即同一个数据库）；
- 部署时各自在托管平台配置环境变量，**不要**把 URL / key 写进任何仓库文件；
- 后台登录使用 **Supabase Auth**（需在 Supabase 控制台开启 Email 认证，并创建一个管理员账号）；
- **RLS 收紧的取舍（重要）**：把策略改为「anon 只读 + authenticated 可写」后，
  前台现有的「新增 / 编辑 / 删除」按钮会写入失败（表现为页脚提示"云端同步失败"、刷新后数据回滚）。
  三条路线可选：

  | 路线 | 影响 |
  | --- | --- |
  | A. 暂不收紧 RLS | 前台按钮正常可用，但任何拿到 key 的人都能改数据（即当前状态） |
  | B. 收紧 RLS（推荐） | 数据安全；前台按钮失效（前台是访客视角，本来也不应改数据） |
  | C. 后续重新部署前台时顺手隐藏按钮 | 需小改前台，属一次性动作 |

  > 无论选哪条，**保活工作流依赖 anon 对 `posts` 的 select 权限**，收紧时务必保留只读策略。

---

*最后更新：2026-09-10（确认后台为独立复制项目，新增 §13 复制与初始化方案）*
