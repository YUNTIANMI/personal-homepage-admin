/**
 * Supabase 云数据层
 *
 * - 仅当配置了 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY` 时启用；
 *   未配置则站点继续使用浏览器本地存储。
 * - 前端用 anon key 直连，权限由 Supabase 的 RLS（行级安全策略）控制，无需自建后端。
 * - 表结构见 README「云端存储」章节：posts / projects，列名与前端字段一一对应。
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { Post, Project, SiteProfile } from '../types'

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

/** 站点配置表名（单行表，结构与列表业务数据不同，单独处理） */
const SITE_PROFILE_TABLE = 'site_profile'

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

/** 拉取云端全部数据（文章、项目、站点配置） */
export async function fetchAllData(): Promise<{
  posts: Post[]
  projects: Project[]
  site: SiteProfile | null
}> {
  const supabase = getClient()
  const [postsRes, projectsRes, siteRes] = await Promise.all([
    supabase.from(COLLECTIONS.posts).select('*'),
    supabase.from(COLLECTIONS.projects).select('*'),
    supabase.from(SITE_PROFILE_TABLE).select('*').limit(1).maybeSingle(),
  ])
  if (postsRes.error) throw postsRes.error
  if (projectsRes.error) throw projectsRes.error
  if (siteRes.error) {
    // 站点配置表可能尚未创建（迁移未执行）：降级为本地默认值，不影响展示
    console.warn('[cloud] 读取站点配置失败，将使用本地默认值：', siteRes.error)
  }
  return {
    posts: (postsRes.data ?? []) as Post[],
    projects: (projectsRes.data ?? []) as Project[],
    site: siteRes.error ? null : ((siteRes.data as SiteProfile | null) ?? null),
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

/** 批量写入（导入用）：按 id upsert，分片提交避免单请求过大 */
export async function upsertDocs(
  collection: CollectionName,
  docs: Array<Post | Project>,
  chunkSize = 100,
): Promise<void> {
  if (docs.length === 0) return
  const supabase = getClient()
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize)
    const { error } = await supabase.from(collection).upsert(chunk, { onConflict: 'id' })
    if (error) throw error
  }
}

/** 保存站点配置（单行表 upsert） */
export async function upsertSiteProfile(profile: SiteProfile): Promise<void> {
  const { error } = await getClient()
    .from(SITE_PROFILE_TABLE)
    .upsert({ id: 'default', ...profile }, { onConflict: 'id' })
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

/* ---------------- 会话有效期（服务端权威校验） ---------------- */

/** 服务端会话校验结果：有效 / 已失效 / 无法判定（未部署校验函数或网络异常） */
export type SessionValidity = 'valid' | 'invalid' | 'unavailable'

/**
 * 调用数据库函数确认当前会话是否仍在有效期内。
 *
 * 判定依据是 auth.sessions.created_at（服务端时间），客户端无法伪造，
 * 因此比本地时间戳更可靠；写策略也同样依赖该函数，做到「客户端怎么改都没用」。
 *
 * 若尚未执行 0002 迁移脚本，函数不存在 → 返回 'unavailable'，调用方应回退为本地判断。
 */
export async function checkSessionValidity(): Promise<SessionValidity> {
  if (!cloudEnabled) return 'unavailable'

  const { data, error } = await getClient().rpc('is_admin_session_valid')

  if (error) {
    const code = (error as { code?: string }).code ?? ''
    const message = error.message ?? ''
    const missing =
      code === 'PGRST202' ||
      code === '42883' ||
      message.includes('Could not find the function') ||
      message.includes('does not exist')
    if (missing) return 'unavailable'
    console.warn('[auth] 会话有效性校验失败，暂按本地判断处理：', error)
    return 'unavailable'
  }

  return data === true ? 'valid' : 'invalid'
}
