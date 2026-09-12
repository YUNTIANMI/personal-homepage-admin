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
import {
  cloudEnabled,
  createPost,
  createProject,
  deletePosts,
  deleteProjects,
  fetchAllData,
  saveSiteConfig,
  updatePost,
  updateProject,
} from './lib/api'

/**
 * 数据仓库：
 * - 后端存储（cloudEnabled 恒为 true）：启动从 Spring Boot 后端拉取，
 *   增删改即时同步；localStorage 仅作为离线缓存兜底（首屏秒开）。
 */

interface State {
  posts: Post[]
  projects: Project[]
  /** 站点基础资料（云端值与本地默认值合并后的结果，永不为空） */
  site: SiteProfile
}

export type Action =
  | { type: 'post/add'; post: Post }
  | { type: 'post/update'; post: Post }
  | { type: 'post/delete'; ids: number[] }
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; project: Project }
  | { type: 'project/delete'; ids: number[] }
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
 * - 有本地缓存 → 先用缓存渲染（首屏不闪空白），后端拉取后再覆盖；
 * - 无缓存 → 返回空，等后端数据。
 */
function loadState(): State {
  const cached = readLocalCache()
  if (cached) return cached
  return {
    posts: [],
    projects: [],
    site: mergeSite(null),
  }
}

/**
 * 把一次本地操作落到后端，返回「应写入本地 state 的权威 Action」。
 *
 * 新增时后端生成自增主键，这里拿回真实 id 后连同本地时间戳一并回填，
 * 保证本地列表与后端数据一致（时间戳由后端权威维护，此处先用本地时间近似，下次 reload 覆盖）。
 */
async function mutateCloud(action: Action): Promise<Action> {
  const now = new Date().toISOString()
  switch (action.type) {
    case 'post/add': {
      const id = await createPost(action.post)
      // 后端新建默认草稿、version 从 0 起，这里回填到本地 state 保持一致
      return {
        type: 'post/add',
        post: { ...action.post, id, status: 'DRAFT', version: 0, createdAt: now, updatedAt: now },
      }
    }
    case 'post/update': {
      await updatePost(action.post.id, action.post)
      // 后端乐观锁使 version +1，本地同步，否则下次编辑会误报 409
      return {
        type: 'post/update',
        post: { ...action.post, version: (action.post.version ?? 0) + 1, updatedAt: now },
      }
    }
    case 'post/delete':
      await deletePosts(action.ids)
      return action
    case 'project/add': {
      const id = await createProject(action.project)
      return { type: 'project/add', project: { ...action.project, id, createdAt: now, updatedAt: now } }
    }
    case 'project/update': {
      await updateProject(action.project.id, action.project)
      return { type: 'project/update', project: { ...action.project, updatedAt: now } }
    }
    case 'project/delete':
      await deleteProjects(action.ids)
      return action
    case 'site/save':
      await saveSiteConfig(action.site)
      return action
    default:
      return action
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'post/add':
      return { ...state, posts: [action.post, ...state.posts] }
    case 'post/update':
      return {
        ...state,
        posts: state.posts.map((p) => (p.id === action.post.id ? action.post : p)),
      }
    case 'post/delete':
      return { ...state, posts: state.posts.filter((p) => !action.ids.includes(p.id)) }
    case 'project/add':
      return { ...state, projects: [action.project, ...state.projects] }
    case 'project/update':
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.project.id ? action.project : p)),
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

        // 内容写入只在后台（登录态）显式发生，这里仅读取，不做任何隐式写入。
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

  // 包装 dispatch：写操作先落到后端（拿回权威 id / 时间戳），成功后再更新本地 state。
  // 返回的 Promise 在后端写入成功时 resolve、失败时 reject，供表单做成功 / 失败提示。
  const dispatch = useCallback(async (action: Action): Promise<void> => {
    if (action.type === 'state/replace') {
      dispatchBase(action)
      return
    }
    try {
      const remote = await mutateCloud(action)
      dispatchBase(remote)
      setSyncStatus('synced')
    } catch (err) {
      console.error('[api] 写入后端失败：', err)
      setSyncStatus('error')
      throw err
    }
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
