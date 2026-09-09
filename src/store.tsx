import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import type { Post, Project } from './types'
import { todayISO } from './utils'

/**
 * 内存数组临时仓库：
 * 数据仅保存在运行期内存中，新增 / 编辑 / 删除直接操作数组，刷新页面即回到初始状态。
 * 这是本需求刻意采用的“前端自闭环”方案，无需后端即可完整演示整套增删改查流程。
 */

/** 内置示例文章的 id（示例仅 1 条，标注「示例 · 可删除」） */
export const SAMPLE_POST_ID = 'sample-welcome'

function buildSeedPosts(): Post[] {
  return [
    {
      id: SAMPLE_POST_ID,
      isSample: true,
      title: '你好，世界 —— 从这里认识罗辑',
      date: todayISO(),
      category: '随笔',
      tags: ['示例', 'Markdown'],
      description:
        '这是一条内置示例数据，用于演示文章的新增、阅读与删除流程。确认无误后可直接点击删除清理干净，再开始正式写作。',
      content: `欢迎来到 **罗辑个人主页**。我是软件工程方向的学习者与开发者，这个站点用来沉淀我的技术博客与软件项目。

> 提示：本条为内置**示例数据**（已标注“示例 · 可删除”），你可以直接把它删除，随后使用右上角「新增文章」创建属于你自己的文章。下方同时演示了本站 Markdown 的渲染能力。

## 支持的能力

本站正文完全使用 Markdown 编写，支持：

- GFM 语法：~~删除线~~、[超链接](https://github.com)、行内 \`code\`
- 代码块语法高亮（浅色 / 深色主题自适应）
- 表格、任务列表、引用、分隔线等

## 一段 TypeScript

\`\`\`ts
interface Engineer {
  name: string
  focus: 'frontend' | 'backend' | 'fullstack'
}

const luoji: Engineer = {
  name: '罗辑',
  focus: 'fullstack',
}

export function greet(person: Engineer): string {
  return \`Hello, I'm \${person.name} — software engineer.\`
}
\`\`\`

## 表格示例

| 章节 | 内容 | 状态 |
| --- | --- | --- |
| 新增 | 填写表单写入列表 | ✅ |
| 编辑 | 回填表单并保存 | ✅ |
| 删除 | 单行 / 批量 | ✅ |

## 任务列表

- [x] 支持 Markdown 渲染
- [x] 支持代码高亮
- [ ] 等待你发布的第一篇文章

---

试试在上方列表对该文章执行 **编辑** 或 **删除**，体验完整的数据管理流程。
`,
    },
  ]
}

export interface State {
  posts: Post[]
  projects: Project[]
}

export type Action =
  | { type: 'post/add'; post: Post }
  | { type: 'post/update'; post: Post }
  | { type: 'post/delete'; ids: string[] }
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; project: Project }
  | { type: 'project/delete'; ids: string[] }

const initialPosts: Post[] = buildSeedPosts()

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'post/add':
      return { ...state, posts: [action.post, ...state.posts] }
    case 'post/update':
      return {
        ...state,
        posts: state.posts.map((p) => {
          if (p.id !== action.post.id) return p
          // 编辑过的数据不再视为示例
          return { ...action.post, isSample: false }
        }),
      }
    case 'post/delete':
      return { ...state, posts: state.posts.filter((p) => !action.ids.includes(p.id)) }
    case 'project/add':
      return { ...state, projects: [action.project, ...state.projects] }
    case 'project/update':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.project.id ? { ...action.project, isSample: false } : p,
        ),
      }
    case 'project/delete':
      return { ...state, projects: state.projects.filter((p) => !action.ids.includes(p.id)) }
    default:
      return state
  }
}

interface StoreValue {
  posts: Post[]
  projects: Project[]
  dispatch: Dispatch<Action>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    posts: initialPosts,
    projects: [],
  }))
  const value = useMemo(() => ({ ...state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore 必须在 <StoreProvider> 内使用')
  return ctx
}
