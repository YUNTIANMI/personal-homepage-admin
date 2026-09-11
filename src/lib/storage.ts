/**
 * Supabase Storage 数据层（assets bucket）
 *
 * - 读取公开：展示站点直接引用公开 URL，无需鉴权；
 * - 上传 / 删除仅限【已登录且会话未过期】的管理员，由数据库侧 Storage 策略强制。
 */
import { uid } from '../utils'
import { getClient } from './cloud'

const ASSETS_BUCKET = 'assets'

/** 单文件上限（与 bucket 设置保持一致） */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** 允许的图片类型（与 bucket 的 allowed_mime_types 保持一致） */
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export interface AssetItem {
  name: string
  /** 对象路径（删除用） */
  path: string
  /** 公开访问地址（引用用） */
  url: string
  size: number
  updatedAt: string | null
}

/** 由对象路径取公开 URL */
function publicUrl(path: string): string {
  return getClient().storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl
}

/** 上传前校验；不通过时返回原因文案 */
function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return '仅支持 PNG / JPG / WebP / GIF 图片'
  if (file.size > MAX_UPLOAD_BYTES) {
    return `图片不能超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`
  }
  return null
}

function extOf(file: File): string {
  const fromName = file.name.includes('.') ? (file.name.split('.').pop() ?? '').toLowerCase() : ''
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  const byType: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return byType[file.type] ?? 'png'
}

/** 上传图片，返回对象路径与公开 URL */
export async function uploadImage(file: File): Promise<{ path: string; url: string }> {
  const invalid = validateImage(file)
  if (invalid) throw new Error(invalid)

  const now = new Date()
  const dir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
  // 用 uid() 而非直接调用 crypto.randomUUID：后者只在安全上下文（HTTPS / localhost）可用，
  // 通过局域网 IP 等地址访问时会抛 “crypto.randomUUID is not a function”。
  const path = `${dir}/${uid()}.${extOf(file)}`

  const { error } = await getClient()
    .storage.from(ASSETS_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
  if (error) throw error

  return { path, url: publicUrl(path) }
}

/** 列出全部图片（按 年/月 目录递归遍历，最多 3 层） */
export async function listAssets(): Promise<AssetItem[]> {
  const bucket = getClient().storage.from(ASSETS_BUCKET)
  const out: AssetItem[] = []

  const walk = async (prefix: string, depth: number): Promise<void> => {
    const { data, error } = await bucket.list(prefix, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (error) throw error

    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      const isFolder = !entry.id && !entry.metadata
      if (isFolder) {
        if (depth < 3) await walk(path, depth + 1)
        continue
      }
      out.push({
        name: entry.name,
        path,
        url: publicUrl(path),
        size: Number((entry.metadata as { size?: number } | null)?.size ?? 0),
        updatedAt: entry.updated_at ?? null,
      })
    }
  }

  await walk('', 0)
  return out
}

/** 删除图片 */
export async function removeAsset(path: string): Promise<void> {
  const { error } = await getClient().storage.from(ASSETS_BUCKET).remove([path])
  if (error) throw error
}

/** 人类可读的文件体积 */
export function fmtBytes(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
