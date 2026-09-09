/** 生成短 id */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** 本地时区今天，格式 yyyy-mm-dd */
export function todayISO(): string {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/** 展示日期：2026-09-09 → 2026年9月9日 */
export function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** 校验一个外链为合法的 http(s) 绝对地址 */
export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** 计算 Markdown 阅读时长（分钟） */
export function readingMinutes(markdown: string): number {
  const text = (markdown || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`_\-|~[\]()]/g, ' ')
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const words = (text.match(/[a-zA-Z0-9]+/g) || []).length
  const minutes = cjk / 300 + words / 200
  return Math.max(1, Math.round(minutes * 10) / 10)
}
