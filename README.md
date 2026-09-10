# 罗辑个人主页（luoji-home）

软件工程方向个人博客与作品集，基于 **React 18 + Vite 6 + TypeScript + Tailwind CSS v4** 的纯前端单页应用。

站点以「个人数字名片」为定位：用一段简洁的 Hero 介绍自己，用文章沉淀技术笔记，用项目卡片展示软件作品，并支持明 / 暗主题与全站响应式布局。

## 功能特性

- **首页**：一句话自我介绍（Hero）+ 数据驱动的站点概览（文章数 / 项目数），大屏自动双栏布局
- **博客**：文章列表管理，支持 **新增 / 编辑 / 删除 / 批量删除**、**即时搜索**（标题 / 摘要 / 标签 / 正文）
- **阅读器**：Markdown 全文渲染，支持 GFM（表格、任务列表、删除线）、**代码块语法高亮**、阅读时长估算，明暗主题自适应
- **项目**：项目卡片网格，支持为每个项目添加多条外链（GitHub / Demo 等，`target="_blank"` + `rel="noopener"`），可增删改
- **关于**：个人名片（自我介绍、技能栈、联系方式），信息来自站点配置文件
- **主题**：浅色为基调、支持深色，跟随系统并可手动切换（记忆在 `localStorage`）
- **响应式**：桌面（1366 / 1440 / 1920 / 2560+）流体布局，平板 / 手机自动回退单列，无横向滚动
- **视觉**：克制的中性配色 + 单一强调色，lucide 线性图标（无 emoji 冒充图标），极淡网格装饰

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | React 18 · TypeScript |
| 构建 | Vite 6（`@vitejs/plugin-react`） |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite`）+ 设计 Token（CSS 变量驱动主题） |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| 图标 | `lucide-react` |
| 状态 | React Hooks（`useReducer` + Context）+ localStorage 本地持久化 |

## 目录结构

```
luoji-home/
├── index.html               # HTML 入口（含主题初始化脚本）
├── vite.config.ts           # Vite + Tailwind 配置
├── tsconfig.json
├── src/
│   ├── main.tsx             # 应用入口
│   ├── App.tsx              # 布局（Header / Main / Footer）与页面路由
│   ├── styles.css           # 设计 Token、主题、Markdown 排版、语法高亮
│   ├── types.ts             # 领域类型（Post / Project / View）
│   ├── store.tsx            # 数据仓库（localStorage 持久化 + 文章 / 项目 增删改查）
│   ├── toast.tsx            # 轻提示
│   ├── utils.ts             # 日期格式化 / 阅读时长等工具
│   ├── lib/
│   │   ├── site.ts          # ★ 站点个人资料配置
│   │   └── markdown.tsx     # Markdown 渲染管线
│   ├── components/
│   │   ├── Header.tsx       # 顶部导航 + 底部 Footer
│   │   ├── ui.tsx           # Button / Input / Chip / PageHead 等基础组件
│   │   ├── Dialog.tsx       # 通用弹窗
│   │   ├── TagInput.tsx     # 标签输入
│   │   └── ...
│   └── pages/               # HomePage / BlogPage / PostReader / ProjectsPage / AboutPage / 表单弹窗
└── docs/
    └── REQUIREMENTS.md      # 开发需求文档（设计基线）
```

## 快速开始

### 环境要求

- Node.js ≥ 18
- npm（或 pnpm / yarn）

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（默认 http://localhost:5173）
npm run dev
```

打开终端提示的地址即可访问。修改 `src/` 下代码会热更新，无需手动刷新。

### 构建与预览

```bash
# 生产构建（先做 TS 类型检查再打包，产物输出到 dist/）
npm run build

# 本地预览构建产物（默认 http://localhost:4173）
npm run preview

# 仅做 TypeScript 类型检查
npm run typecheck
```

### 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（HMR） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run typecheck` | TypeScript 类型检查 |

## 数据如何管理

文章与项目保存在浏览器 **localStorage**（键名 `luoji.store.v1`）中，**新增 / 编辑 / 删除后刷新或关闭浏览器都不会丢失**。

- **首次访问**：本地无数据时载入 1 条内置示例文章（标注「示例 · 可删除」），删除后**不会再自动出现**
- **新增文章**：进入「博客」页 → 右上角「新增文章」→ 填写标题 / 分类 / 标签 / 摘要 / Markdown 正文 → 发布
- **编辑 / 删除**：文章行内操作图标，支持单篇删除与复选框批量删除
- **新增项目**：进入「项目」页 → 「新增项目」→ 填写名称 / 简介 / 技术标签，并至少添加一条外链（如 GitHub）
- **个人资料**：站点名称、一句话介绍、GitHub / 邮箱、技能栈在 `src/lib/site.ts` 中配置

> 数据存储机制：`src/store.tsx` + `src/lib/cloud.ts`
> - **未配置云端** → 本地模式：数据存 localStorage（键 `luoji.store.v1`），仅当前浏览器有效
> - **配置了云端** → 云端模式：云数据库为权威数据源，localStorage 仅作离线缓存
>
> 想恢复出厂示例数据（本地模式）：DevTools → Application → Local Storage → 删除 `luoji.store.v1`，刷新即可。

## 云端存储（换电脑也能看到数据）

默认走浏览器本地存储，**换电脑 / 换浏览器数据不通用**。接入 **Supabase**（免费）后即切换为云端存储（纯前端直连，无需自建后端）：

1. 注册 [supabase.com](https://supabase.com)，**New project** 新建项目（免费版；区域选离你较近的，如 Singapore）
2. 打开 **SQL Editor**，粘贴执行下面这段 SQL（建两张表 + 开放匿名读写权限）：

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

-- 开启行级安全（RLS）并允许匿名读写（个人站点可用；多人/生产环境请收紧）
alter table public.posts enable row level security;
alter table public.projects enable row level security;

create policy "posts anon all" on public.posts
  for all to anon using (true) with check (true);
create policy "projects anon all" on public.projects
  for all to anon using (true) with check (true);
```

3. 打开 **Project Settings → API**，复制 **Project URL** 与 **anon public key**
4. 复制 `.env.example` 为 `.env.local`，填入这两项，重启 `npm run dev`
5. 页脚显示「云端同步正常」即接入成功；**首次启用会自动把当前浏览器里已有的文章 / 项目迁移到云端**

> 换电脑时填同一组 URL + Key 即可看到同一份数据；云端不可用时会自动回退本地缓存，并在页脚提示「云端同步失败」。
>
> **免费版保活**：Supabase 免费项目 7 天无请求会被暂停，仓库已内置 [`.github/workflows/supabase-keep-alive.yml`](.github/workflows/supabase-keep-alive.yml)，每 5 天自动请求一次。启用前需在 GitHub 仓库 → Settings → Secrets and variables → Actions 添加 `SUPABASE_URL` 与 `SUPABASE_ANON_KEY` 两个 Secret。

## 个性化配置

编辑 `src/lib/site.ts` 替换为真实信息：

```ts
export const SITE = {
  name: '罗辑',           // 显示名称
  en: 'LUOJI',            // 英文标识
  role: 'Software Engineer · 软件工程',
  headline: '写代码，也写文章。',
  intro: '一句话介绍……',
  github: 'https://github.com/…',   // 留空则不展示 GitHub 图标
  email: 'you@example.com',         // 留空则不展示邮箱入口
  tech: ['TypeScript', 'React', '…'], // 关于页技能栈
  startYear: 2026,
}
```

## 部署

纯静态站点，构建产物为 `dist/`，可部署到任意静态托管：

```bash
npm run build
```

- **Vercel / Netlify / CloudBase**：导入仓库，构建命令 `npm run build`，输出目录 `dist`
- **GitHub Pages**：若部署到 `https://<user>.github.io/<repo>/` 子路径，需在 `vite.config.ts` 设置 `base: '/<repo>/'` 后重新构建
- 本地验证部署结果：`npm run preview`

## 设计说明

- 主题 Token 集中在 `src/styles.css`：`--canvas` / `--surface` / `--line` / `--ink` / `--brand` 等，`.dark` 下覆盖为深色值，`@theme inline` 映射为 Tailwind 颜色（`bg-canvas`、`text-ink`、`border-line` 等）
- 桌面端采用「根字号随视口阶梯放大」的排版系统，保证 1366 → 2560 各档下字号与间距的可读性
- 需求与设计基线见 [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)

## License

私有项目，版权所有。
