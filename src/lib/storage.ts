/**
 * 媒体数据层。
 *
 * 图片上传 / 列举 / 删除均走后端 /api/media/*，文件由后端落到本地磁盘（StorageService 抽象），
 * 前端只拿到公开 URL 与元数据。读取公开、上传与删除需登录，由后端 Security 与 Service 双重校验。
 */
import { getAccessToken, request, type ApiError } from './api'

const API_BASE = String(import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api').replace(/\/+$/, '')

/** 单文件上限（与后端 MediaServiceImpl 保持一致） */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** 允许的图片类型（与后端保持一致） */
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export interface AssetItem {
  /** 后端自增主键（删除用） */
  id: number
  /** 原始文件名 */
  name: string
  /** 存储相对路径 yyyy/MM/uuid.ext */
  path: string
  /** 公开访问地址（引用用） */
  url: string
  size: number
  createdAt: string
}

/** 后端 MediaVO 的原始形态 */
interface MediaVO {
  id: number
  filename: string
  path: string
  url: string
  size: number
  mime: string
  createdAt: string
}

/** 上传前校验；不通过时返回原因文案 */
function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return '仅支持 PNG / JPG / WebP / GIF 图片'
  if (file.size > MAX_UPLOAD_BYTES) {
    return `图片不能超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`
  }
  return null
}

function toAssetItem(v: MediaVO): AssetItem {
  return {
    id: v.id,
    name: v.filename,
    path: v.path,
    url: v.url,
    size: Number(v.size ?? 0),
    createdAt: v.createdAt,
  }
}

/** 上传图片，返回对象元数据 */
export async function uploadImage(file: File): Promise<{ path: string; url: string }> {
  const invalid = validateImage(file)
  if (invalid) throw new Error(invalid)

  const form = new FormData()
  form.append('file', file)

  const token = getAccessToken()

  let res: Response
  try {
    res = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
  } catch {
    throw new Error('网络连接失败，请确认后端服务已启动')
  }

  const body = (await res.json().catch(() => null)) as { code: number; message: string; data: MediaVO } | null
  if (!res.ok || !body || body.code !== 0) {
    const err = new Error(body?.message ?? '上传失败') as ApiError
    throw err
  }
  return { path: body.data.path, url: body.data.url }
}

/** 列出全部图片（服务端分页，单页取上限 200，个人站点够用） */
export async function listAssets(): Promise<AssetItem[]> {
  const page = await request<{ total: number; records: MediaVO[] }>('/media?page=1&size=200')
  return (page.records ?? []).map(toAssetItem)
}

/** 删除图片（按后端主键 id） */
export async function removeAsset(id: number): Promise<void> {
  await request<void>(`/media/${id}`, { method: 'DELETE' })
}

/** 人类可读的文件体积 */
export function fmtBytes(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
