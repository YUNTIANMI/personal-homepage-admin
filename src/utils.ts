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

/**
 * 把 Markdown 压成纯文本。
 *
 * 只删除标记语法、保留可见文案：图片留 alt、链接留可见文字并丢弃地址；
 * 代码块与行内代码整段丢弃（与阅读时长的统计口径一致）。
 */
export function markdownToPlainText(markdown: string): string {
  return (markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    // 图片保留 alt、链接保留可见文字，地址一律丢弃
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    // 标题 / 引用 / 列表 / 分隔线等行首标记
    .replace(/^[ \t]{0,3}(?:#{1,6}|>|[-*+]|\d+\.)[ \t]+/gm, '')
    .replace(/^[ \t]{0,3}(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm, ' ')
    // 行内强调符号
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 计算 Markdown 阅读时长（分钟） */
export function readingMinutes(markdown: string): number {
  const text = markdownToPlainText(markdown)
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const words = (text.match(/[a-zA-Z0-9]+/g) || []).length
  const minutes = cjk / 300 + words / 200
  return Math.max(1, Math.round(minutes * 10) / 10)
}

/**
 * 列表摘要：优先用 description，留空时从正文提取纯文本并截断。
 * 用于展示站博客列表与后台文章列表，避免把 `![alt](url)` 之类的语法直接显示出来。
 */
export function excerptOf(
  source: { description?: string; content?: string },
  max = 90,
): string {
  const desc = source.description?.trim()
  if (desc) return desc
  const text = markdownToPlainText(source.content ?? '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/**
 * 复制文本到剪贴板，返回是否成功。
 *
 * Clipboard API 只在「安全上下文」（HTTPS 或 localhost）下存在，
 * 通过局域网 IP / 非 https 域名访问时 `navigator.clipboard` 为 undefined，
 * 因此这里在不可用时回退到隐藏 textarea + `execCommand('copy')`。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      /* 权限被拒等情况继续走下面的回退方案 */
    }
  }

  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.top = '-1000px'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}
