# luoji-admin · 个人主页后台管理系统

[罗辑个人主页](https://github.com/YUNTIANMI/personal-homepage)（`luoji-home`）的**后台管理系统**。

> **与前台项目的关系**：本项目由 `luoji-home` 复制而来，**前台项目保持独立、不做任何修改**；
> 所有后台相关改动只发生在本仓库。两个项目**共用同一个 Supabase 数据库** —— 后台负责写入，前台负责展示。

## 当前状态

🚧 **开发中**：已完成项目复制与初始化（改名、环境变量、远端指向），后台功能待开发。

完整的开发交接信息（数据模型、Supabase 表结构与 RLS、可复用组件、设计系统、全部开发决策）见
**[`docs/ADMIN-PANEL-HANDOFF.md`](docs/ADMIN-PANEL-HANDOFF.md)** —— 动手前请先完整阅读。

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6（`@vitejs/plugin-react`） |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite`）+ CSS 变量设计 Token |
| 数据库 | Supabase（`@supabase/supabase-js`） |
| 鉴权 | Supabase Auth（后台登录，待接入） |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| 图标 | `lucide-react` |

## 快速开始

环境要求：Node.js ≥ 18。

```bash
npm install     # 安装依赖
npm run dev     # 开发服务器 → http://localhost:5173

npm run build     # 类型检查 + 生产构建（输出 dist/）
npm run preview   # 本地预览构建产物
npm run typecheck # 仅类型检查
```

## 环境变量

复制 `.env.example` 为 `.env.local` 并填入 Supabase 凭据（**该文件已被 `.gitignore` 忽略，禁止入库**）：

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

> ⚠️ `VITE_SUPABASE_URL` 必须是 **base 地址**：不要带 `/rest/v1/`、不要有结尾斜杠。
> `supabase-js` 会自行拼接 `/rest/v1`，带上会变成 `.../rest/v1//rest/v1/...` 从而 404。
>
> 本项目与前台 `luoji-home` 使用**同一组** Supabase 凭据（同一个数据库）。

## 与前台共用数据库的注意事项

- **RLS 现状**：当前策略为「anon 匿名全量读写」，任何人都能用前端 key 改数据；
- 后台接入登录后，应把策略收紧为「**anon 只读 + authenticated 可写**」（SQL 见交接文档 §4）；
- 收紧时**必须保留 anon 对 `posts` 的 `select` 权限**，否则仓库内的
  [`.github/workflows/supabase-keep-alive.yml`](.github/workflows/supabase-keep-alive.yml) 保活任务会 401 失败；
- 前台在 RLS 收紧后，其页面上的「新增 / 编辑 / 删除」按钮会写入失败（前台是访客视角，属预期）。

## 开发计划

1. **阶段一（MVP）**：登录鉴权 → 仪表盘 → 文章管理（增删改查 / 搜索 / 批量删除）→ 项目管理 → Markdown 编辑预览
2. **阶段二**：草稿 / 发布状态、图片上传（Supabase Storage）、站点配置可视化编辑、数据导入导出

详细方案与决策记录见 `docs/ADMIN-PANEL-HANDOFF.md`。

## License

私有项目，版权所有。
