import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import type { Post, Project, SiteProfile } from './types'
import { mergeSite } from './lib/site'
import { todayISO } from './utils'
import {
  COLLECTIONS,
  cloudEnabled,
  fetchAllData,
  removeDocs,
  upsertDoc,
  upsertSiteProfile,
} from './lib/cloud'

/**
 * 数据仓库：
 * - 配置了 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY 时走【云端存储】：
 *   启动从云数据库拉取，增删改即时同步到云端，
 *   换电脑 / 换浏览器都能看到同一份数据（localStorage 仅作为离线缓存兜底）；
 * - 未配置时走【本地模式】：数据只存在当前浏览器，首次访问载入内置示例文章。
 */

/** 内置示例文章的 id（示例仅 1 条，标注「示例 · 可删除」） */
const SAMPLE_POST_ID = 'sample-welcome'

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

interface State {
  posts: Post[]
  projects: Project[]
  /** 站点基础资料（云端值与本地默认值合并后的结果，永不为空） */
  site: SiteProfile
}

export type Action =
  | { type: 'post/add'; post: Post }
  | { type: 'post/update'; post: Post }
  | { type: 'post/delete'; ids: string[] }
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; project: Project }
  | { type: 'project/delete'; ids: string[] }
  /** 保存站点配置 */
  | { type: 'site/save'; site: SiteProfile }
  /** 用云端返回的数据整体替换（初始化拉取时使用，不触发回写） */
  | { type: 'state/replace'; posts: Post[]; projects: Project[]; site: SiteProfile }

/** 数据来源状态：本地模式 / 云端加载中 / 已同步 / 同步失败 */
type SyncStatus = 'local' | 'loading' | 'synced' | 'error'

/** 本地缓存键（保持原键名不变，避免老用户已有数据丢失） */
const STORAGE_KEY = 'luoji.store.v1'

/** 读取本地缓存；无数据 / 解析失败时返回 null */
function readLocalCache(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>
      if (Array.isArray(parsed.posts) && Array.isArray(parsed.projects)) {
        return { posts: parsed.posts, projects: parsed.projects, site: mergeSite(parsed.site) }
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
  return {
    posts: cloudEnabled ? [] : buildSeedPosts(),
    projects: [],
    site: mergeSite(null),
  }
}

/**
 * 为新增 / 更新的内容补上本地时间戳。
 *
 * 云端 `updated_at` 由数据库触发器维护，但本地对象拿不到该值，导致：
 * - 「按更新时间」排序时刚保存的内容不置顶；
 * - 仪表盘「最近更新」滞后于实际编辑。
 * 因此本地先盖一个 ISO 时间戳，写入云端后由触发器覆盖为权威值。
 */
function stampTimestamps(action: Action): Action {
  const now = new Date().toISOString()
  switch (action.type) {
    case 'post/add':
      return {
        ...action,
        post: { ...action.post, created_at: action.post.created_at ?? now, updated_at: now },
      }
    case 'post/update':
      return { ...action, post: { ...action.post, updated_at: now } }
    case 'project/add':
      return {
        ...action,
        project: {
          ...action.project,
          created_at: action.project.created_at ?? now,
          updated_at: now,
        },
      }
    case 'project/update':
      return { ...action, project: { ...action.project, updated_at: now } }
    default:
      return action
  }
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
    case 'site/save':
      return [upsertSiteProfile(action.site)]
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
    case 'site/save':
      return { ...state, site: action.site }
    case 'state/replace':
      return { posts: action.posts, projects: action.projects, site: action.site }
    default:
      return state
  }
}

interface StoreValue {
  posts: Post[]
  projects: Project[]
  /** 站点基础资料（展示站点与后台共用，永不为空） */
  site: SiteProfile
  /** 派发操作：本地立即生效；返回的 Promise 在云端写入成功时 resolve、失败时 reject */
  dispatch: (action: Action) => Promise<void>
  /** 是否启用了云端存储 */
  cloudEnabled: boolean
  /** 云端同步状态，可用于界面提示 */
  syncStatus: SyncStatus
  /** 重新从云端拉取全部数据（失败时抛错，供错误态「重试」使用） */
  reload: () => Promise<void>
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

        // 注意：这里不再做「本地数据迁移上传」。
        // 展示站点对所有访客开放，任何隐式写入都会被 RLS 拒绝并污染同步状态；
        // 内容写入只允许在后台（登录态）显式发生。
        dispatchBase({
          type: 'state/replace',
          posts: remote.posts,
          projects: remote.projects,
          site: mergeSite(remote.site),
        })
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

  // 包装 dispatch：先本地更新（界面即时响应），再同步写入云端。
  // 返回的 Promise 在云端写入成功时 resolve、失败时 reject，供表单做成功 / 失败提示。
  const dispatch = useCallback((action: Action): Promise<void> => {
    const stamped = stampTimestamps(action)
    dispatchBase(stamped)
    if (!cloudEnabled || stamped.type === 'state/replace') return Promise.resolve()
    const tasks = syncToCloud(stamped)
    if (tasks.length === 0) return Promise.resolve()
    return Promise.all(tasks)
      .then(() => setSyncStatus('synced'))
      .catch((err) => {
        console.error('[cloud] 写入云端失败：', err)
        setSyncStatus('error')
        throw err
      })
  }, [])

  // 重新拉取云端数据：用于错误态手动重试
  const reload = useCallback(async () => {
    if (!cloudEnabled) return
    setSyncStatus('loading')
    try {
      const remote = await fetchAllData()
      dispatchBase({
        type: 'state/replace',
        posts: remote.posts,
        projects: remote.projects,
        site: mergeSite(remote.site),
      })
      setSyncStatus('synced')
    } catch (err) {
      console.error('[cloud] 重新拉取云端数据失败：', err)
      setSyncStatus('error')
      throw err
    }
  }, [])

  const value = useMemo(
    () => ({ ...state, dispatch, cloudEnabled, syncStatus, reload }),
    [state, dispatch, syncStatus, reload],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore 必须在 <StoreProvider> 内使用')
  return ctx
}
