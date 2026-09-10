import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'
import type { Post, Project } from './types'
import { todayISO } from './utils'
import {
  COLLECTIONS,
  cloudEnabled,
  fetchAllData,
  removeDocs,
  upsertDoc,
} from './lib/cloud'

/**
 * 数据仓库：
 * - 配置了 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY 时走【云端存储】：
 *   启动从云数据库拉取，增删改即时同步到云端，
 *   换电脑 / 换浏览器都能看到同一份数据（localStorage 仅作为离线缓存兜底）；
 * - 未配置时走【本地模式】：数据只存在当前浏览器，首次访问载入内置示例文章。
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
  /** 用云端返回的数据整体替换（初始化拉取时使用，不触发回写） */
  | { type: 'state/replace'; posts: Post[]; projects: Project[] }

/** 数据来源状态：本地模式 / 云端加载中 / 已同步 / 同步失败 */
export type SyncStatus = 'local' | 'loading' | 'synced' | 'error'

/** 本地缓存键（保持原键名不变，避免老用户已有数据丢失） */
const STORAGE_KEY = 'luoji.store.v1'

/** 读取本地缓存；无数据 / 解析失败时返回 null */
function readLocalCache(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>
      if (Array.isArray(parsed.posts) && Array.isArray(parsed.projects)) {
        return { posts: parsed.posts, projects: parsed.projects }
      }
    }
  } catch {
    /* 数据损坏或浏览器禁用存储：忽略，走兜底逻辑 */
  }
  return null
}

/**
 * 初始状态：
 * - 有本地缓存 → 先用缓存渲染（首屏不闪空白），云端拉取后再覆盖；
 * - 无缓存且未启用云端 → 注入内置示例文章；
 * - 无缓存且启用云端 → 返回空，等云端数据（不把示例写进云）。
 */
function loadState(): State {
  const cached = readLocalCache()
  if (cached) return cached
  return cloudEnabled ? { posts: [], projects: [] } : { posts: buildSeedPosts(), projects: [] }
}

/** 把一次本地操作转换为对应的云端写请求 */
function syncToCloud(action: Action): Promise<void>[] {
  switch (action.type) {
    case 'post/add':
    case 'post/update':
      return [upsertDoc(COLLECTIONS.posts, action.post)]
    case 'project/add':
    case 'project/update':
      return [upsertDoc(COLLECTIONS.projects, action.project)]
    case 'post/delete':
      return [removeDocs(COLLECTIONS.posts, action.ids)]
    case 'project/delete':
      return [removeDocs(COLLECTIONS.projects, action.ids)]
    default:
      return []
  }
}

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
    case 'state/replace':
      return { posts: action.posts, projects: action.projects }
    default:
      return state
  }
}

interface StoreValue {
  posts: Post[]
  projects: Project[]
  dispatch: Dispatch<Action>
  /** 是否启用了云端存储 */
  cloudEnabled: boolean
  /** 云端同步状态，可用于界面提示 */
  syncStatus: SyncStatus
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatchBase] = useReducer(reducer, undefined, loadState)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudEnabled ? 'loading' : 'local')

  // 本地缓存（离线兜底 + 首屏秒开）
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* 存储不可用（隐私模式 / 超出配额）时静默忽略 */
    }
  }, [state])

  // 启动时从云端拉取：以云端数据为准
  useEffect(() => {
    if (!cloudEnabled) return
    let cancelled = false
    void (async () => {
      try {
        const remote = await fetchAllData()
        if (cancelled) return

        // 首次启用云端（云端为空而本地有数据）→ 把本地数据迁移上传，避免丢失
        if (remote.posts.length === 0 && remote.projects.length === 0) {
          const local = readLocalCache()
          if (local && (local.posts.length > 0 || local.projects.length > 0)) {
            await Promise.all([
              ...local.posts.map((p) => upsertDoc(COLLECTIONS.posts, p)),
              ...local.projects.map((j) => upsertDoc(COLLECTIONS.projects, j)),
            ])
            if (!cancelled) setSyncStatus('synced')
            return
          }
        }

        dispatchBase({ type: 'state/replace', posts: remote.posts, projects: remote.projects })
        setSyncStatus('synced')
      } catch (err) {
        console.error('[cloud] 读取云端数据失败：', err)
        if (!cancelled) setSyncStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 包装 dispatch：先本地更新（界面即时响应），再异步同步到云端
  const dispatch = useCallback<Dispatch<Action>>((action) => {
    dispatchBase(action)
    if (!cloudEnabled || action.type === 'state/replace') return
    const tasks = syncToCloud(action)
    if (tasks.length === 0) return
    void Promise.all(tasks)
      .then(() => setSyncStatus('synced'))
      .catch((err) => {
        console.error('[cloud] 写入云端失败：', err)
        setSyncStatus('error')
      })
  }, [])

  const value = useMemo(
    () => ({ ...state, dispatch, cloudEnabled, syncStatus }),
    [state, dispatch, syncStatus],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore 必须在 <StoreProvider> 内使用')
  return ctx
}
