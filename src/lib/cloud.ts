/**
 * Supabase 云数据层
 *
 * - 仅当配置了 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY` 时启用；
 *   未配置则站点继续使用浏览器本地存储。
 * - 前端用 anon key 直连，权限由 Supabase 的 RLS（行级安全策略）控制，无需自建后端。
 * - 表结构见 README「云端存储」章节：posts / projects，列名与前端字段一一对应。
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { Post, Project } from '../types'

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** 是否启用云端存储 */
export const cloudEnabled = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0

/** 云端表名 */
export const COLLECTIONS = {
  posts: 'posts',
  projects: 'projects',
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]

let client: SupabaseClient | null = null

/** 获取 Supabase 客户端（单例） */
export function getClient(): SupabaseClient {
  if (!cloudEnabled) {
    throw new Error('未配置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，云端存储未启用')
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      // 后台需要保持管理员登录态：持久化会话并自动续期
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // 后台为独立入口，不走 URL 回调解析
        detectSessionInUrl: false,
      },
    })
  }
  return client
}

/** 拉取云端全部文章与项目 */
export async function fetchAllData(): Promise<{ posts: Post[]; projects: Project[] }> {
  const supabase = getClient()
  const [postsRes, projectsRes] = await Promise.all([
    supabase.from(COLLECTIONS.posts).select('*'),
    supabase.from(COLLECTIONS.projects).select('*'),
  ])
  if (postsRes.error) throw postsRes.error
  if (projectsRes.error) throw projectsRes.error
  return {
    posts: (postsRes.data ?? []) as Post[],
    projects: (projectsRes.data ?? []) as Project[],
  }
}

/** 新增或更新一条记录（主键为业务 id，冲突时覆盖） */
export async function upsertDoc(collection: CollectionName, doc: Post | Project): Promise<void> {
  const { error } = await getClient()
    .from(collection)
    .upsert({ ...doc }, { onConflict: 'id' })
  if (error) throw error
}

/** 按业务 id 批量删除 */
export async function removeDocs(collection: CollectionName, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await getClient().from(collection).delete().in('id', ids)
  if (error) throw error
}

/* ---------------- 认证（Supabase Auth） ---------------- */

/** 读取当前会话（未登录 / 未启用云端时返回 null） */
export async function getSession(): Promise<Session | null> {
  if (!cloudEnabled) return null
  const { data, error } = await getClient().auth.getSession()
  if (error) throw error
  return data.session
}

/** 邮箱 + 密码登录 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<Session | null> {
  const { data, error } = await getClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
  return data.session
}

/** 退出登录 */
export async function signOut(): Promise<void> {
  if (!cloudEnabled) return
  const { error } = await getClient().auth.signOut()
  if (error) throw error
}

/** 监听登录态变化，返回取消订阅函数 */
export function onAuthStateChange(cb: (session: Session | null) => void): () => void {
  if (!cloudEnabled) return () => {}
  const { data } = getClient().auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

/** 判断错误是否为「会话失效 / 未认证」（RLS 收紧后写入被拒时会出现） */
export function isAuthError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status
  if (status === 401 || status === 403) return true
  const message = err instanceof Error ? err.message.toLowerCase() : ''
  return (
    message.includes('jwt') ||
    message.includes('unauthorized') ||
    message.includes('not authenticated') ||
    message.includes('row-level security')
  )
}
