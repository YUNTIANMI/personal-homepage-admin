/**
 * 自研后端 API 数据层。
 *
 * 替代原 Supabase SDK：所有数据读写、认证、媒体都走 Spring Boot 后端的 /api/* 接口。
 * 前端只依赖本文件暴露的函数，其余模块不直接 fetch。
 *
 * 接口契约见 docs/BACKEND-ARCHITECTURE.md §6：
 * - 统一响应体 `{ code, message, data }`，code === 0 表示成功；
 * - 认证：登录拿到 access（30 分钟）+ refresh（7 天），access 过期后用 refresh 静默续期；
 * - 分页：列表接口返回 `{ total, page, size, pages, records }`。
 */
import type { AuthSession, AuthUser, Post, PostRevision, Project, SiteProfile } from '../types'

/** 后端 API 根地址（可被 VITE_API_BASE 覆盖，默认本地 8080） */
const API_BASE = String(import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api').replace(/\/+$/, '')

/** 是否启用后端存储（后端改造后恒为 true） */
export const cloudEnabled = true

/* ---------------- token 管理 ---------------- */

const ACCESS_KEY = 'luoji.admin.accessToken'
const REFRESH_KEY = 'luoji.admin.refreshToken'

/** 读取当前 access token（供认证恢复与上传等非 request 路径使用） */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY)
  } catch {
    return null
  }
}

function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

/** 保存登录后拿到的令牌对 */
export function setTokens(access: string, refresh: string): void {
  try {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  } catch {
    /* 存储不可用时静默忽略 */
  }
}

/** 清除令牌（登出 / 会话失效） */
export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    /* ignore */
  }
}

/* ---------------- 统一请求封装 ---------------- */

/** 后端统一响应体 */
interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

/** 后端分页响应体 */
interface PageEnvelope<T> {
  total: number
  page: number
  size: number
  pages: number
  records: T[]
}

/** 登录结果（后端 LoginResponse） */
interface LoginResult extends AuthSession {}

/** 携带 HTTP 状态码与业务错误码的异常，供登录页等精确提示 */
export class ApiError extends Error {
  readonly status: number
  readonly code: number

  constructor(status: number, code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * 发起请求并解析统一响应体。
 *
 * - 自动携带 Authorization 头；
 * - 401 时用 refresh 换新 access 后重试一次，仍失败则清空令牌并抛「登录已过期」；
 * - 业务失败（code !== 0）统一抛 {@link ApiError}。
 */
export async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) ?? {}) }
  const token = getAccessToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options.body != null && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, -1, '网络连接失败，请确认后端服务已启动')
  }

  if (res.status === 401 && !retried) {
    const ok = await tryRefresh()
    if (ok) return request<T>(path, options, true)
    clearTokens()
    throw new ApiError(401, 40100, '登录已过期，请重新登录')
  }

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!res.ok || !body || body.code !== 0) {
    throw new ApiError(res.status, body?.code ?? -1, body?.message ?? `请求失败（HTTP ${res.status}）`)
  }
  return body.data
}

/** 用 refresh 换新 access；成功返回 true */
async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return false
    const body = (await res.json()) as ApiEnvelope<LoginResult>
    if (body.code !== 0) return false
    setTokens(body.data.accessToken, body.data.refreshToken)
    return true
  } catch {
    return false
  }
}

/* ---------------- 数据读取 ---------------- */

/**
 * 拉取全部数据（文章、项目、站点配置）。
 *
 * 个人博客数据量小，用单页上限（200）一次性取回；搜索 / 排序 / 分页仍在前端内存完成，
 * 后续需要时再下沉到服务端。
 */
export async function fetchAllData(): Promise<{
  posts: Post[]
  projects: Project[]
  site: SiteProfile | null
}> {
  const [postsPage, projectsPage, site] = await Promise.all([
    request<PageEnvelope<Post>>('/posts?page=1&size=200'),
    request<PageEnvelope<Project>>('/projects?page=1&size=200'),
    request<SiteProfile>('/site-config').catch(() => null),
  ])
  return {
    posts: postsPage.records ?? [],
    projects: projectsPage.records ?? [],
    site,
  }
}

/* ---------------- 写操作（文章） ---------------- */

/** 文章入参（去掉 id 与内部字段，字段名对齐后端 PostSaveDTO） */
interface PostInput {
  title: string
  date: string
  category: string
  tags: string[]
  summary: string
  content: string
  version?: number
}

function toPostInput(p: Post): PostInput {
  return {
    title: p.title,
    date: p.date,
    category: p.category ?? '',
    tags: p.tags ?? [],
    summary: p.description ?? '',
    content: p.content,
    version: p.version,
  }
}

/** 新建文章，返回后端生成的自增 id */
export async function createPost(post: Post): Promise<number> {
  return request<number>('/posts', { method: 'POST', body: JSON.stringify(toPostInput(post)) })
}

/** 编辑文章 */
export async function updatePost(id: number, post: Post): Promise<void> {
  await request<void>(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(toPostInput(post)) })
}

/** 删除文章（单个或多个） */
export async function deletePosts(ids: number[]): Promise<void> {
  if (ids.length === 0) return
  await request<void>('/posts', { method: 'DELETE', body: JSON.stringify(ids) })
}

/** 状态流转（发布 / 归档 / 回退草稿），version 用于乐观锁 */
export async function changePostStatus(id: number, status: string, version: number): Promise<void> {
  await request<void>(`/posts/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, version }),
  })
}

/** 置顶开关与排序权重 */
export async function togglePostTop(id: number, isTop: number, sort: number): Promise<void> {
  await request<void>(`/posts/${id}/top`, {
    method: 'PUT',
    body: JSON.stringify({ isTop, sort }),
  })
}

/** 回收站列表（已逻辑删除的文章） */
export async function fetchTrashPosts(): Promise<Post[]> {
  const page = await request<PageEnvelope<Post>>('/posts/trash?page=1&size=200')
  return page.records ?? []
}

/** 从回收站恢复 */
export async function restorePost(id: number): Promise<void> {
  await request<void>(`/posts/${id}/restore`, { method: 'PUT' })
}

/** 历史版本列表 */
export async function fetchRevisions(id: number): Promise<PostRevision[]> {
  return request<PostRevision[]>(`/posts/${id}/revisions`)
}

/** 回滚到指定历史版本，返回回滚后的文章 */
export async function rollbackPost(id: number, version: number): Promise<Post> {
  return request<Post>(`/posts/${id}/revisions/${version}/rollback`, { method: 'POST' })
}

/* ---------------- 写操作（项目） ---------------- */

/** 项目入参（对齐后端 ProjectSaveDTO） */
export interface ProjectInput {
  name: string
  tagline: string
  tech: string[]
  links: Array<{ id: string; label: string; href: string }>
}

function toProjectInput(p: Project): ProjectInput {
  return {
    name: p.name,
    tagline: p.tagline ?? '',
    tech: p.tech ?? [],
    links: p.links ?? [],
  }
}

/** 新建项目，返回后端生成的自增 id */
export async function createProject(project: Project): Promise<number> {
  return request<number>('/projects', { method: 'POST', body: JSON.stringify(toProjectInput(project)) })
}

/** 编辑项目 */
export async function updateProject(id: number, project: Project): Promise<void> {
  await request<void>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(toProjectInput(project)) })
}

/** 删除项目（单个或多个） */
export async function deleteProjects(ids: number[]): Promise<void> {
  if (ids.length === 0) return
  await request<void>('/projects', { method: 'DELETE', body: JSON.stringify(ids) })
}

/* ---------------- 写操作（站点配置） ---------------- */

/** 保存站点配置 */
export async function saveSiteConfig(profile: SiteProfile): Promise<void> {
  await request<void>('/site-config', { method: 'PUT', body: JSON.stringify(profile) })
}

/* ---------------- 认证 ---------------- */

/** 用户名 + 密码登录 */
export async function apiLogin(username: string, password: string): Promise<AuthSession> {
  const result = await request<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), password }),
  })
  setTokens(result.accessToken, result.refreshToken)
  return result
}

/** 登出（服务端把当前 access 加入黑名单） */
export async function apiLogout(): Promise<void> {
  try {
    await request<void>('/auth/logout', { method: 'POST' })
  } finally {
    clearTokens()
  }
}

/** 读取当前登录用户 */
export async function apiMe(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me')
}

/** 修改密码（成功后服务端吊销该用户全部 token） */
export async function apiChangePassword(oldPassword: string, newPassword: string): Promise<void> {
  await request<void>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ oldPassword, newPassword }),
  })
}

/* ---------------- 导入导出 ---------------- */

/** 导出全量数据（后端汇总） */
export async function exportData(): Promise<unknown> {
  return request<unknown>('/export')
}

/** 导入全量数据（后端事务写入，失败整体回滚） */
export async function importData(payload: unknown): Promise<{
  postsAdded: number
  projectsAdded: number
  siteUpdated: boolean
}> {
  return request('/import', { method: 'POST', body: JSON.stringify(payload) })
}
