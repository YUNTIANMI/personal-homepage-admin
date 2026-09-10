import { ArrowLeft, CalendarDays, Clock3 } from 'lucide-react'
import type { Post } from '../types'
import { Chip } from '../components/ui'
import { MarkdownRenderer } from '../lib/markdown'
import { fmtDate, readingMinutes } from '../utils'

/** 文章阅读页（展示站点）：只读，不提供编辑 / 删除入口 */
export function PostReader({ post, onBack }: { post: Post; onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* 顶栏 */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onBack}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[15px] text-ink-soft transition-colors hover:bg-canvas-soft hover:text-ink"
        >
          <ArrowLeft size={17} /> 返回文章列表
        </button>
      </div>

      {/* 文章主体 */}
      <article className="mt-7 rounded-2xl border border-line bg-surface px-7 py-10 shadow-sm sm:px-12">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            {post.category && <Chip tone="brand">{post.category}</Chip>}
            {post.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
          <h1 className="mt-5 text-[clamp(1.75rem,2vw_+_0.7rem,2.5rem)] font-bold leading-tight tracking-tight text-ink">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[13px] text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} /> {fmtDate(post.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} /> 约 {readingMinutes(post.content)} 分钟
            </span>
          </div>
        </header>
        <hr className="my-7 border-line" />
        <MarkdownRenderer content={post.content} />
      </article>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onBack}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line-strong px-6 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-brand hover:text-brand"
        >
          <ArrowLeft size={16} /> 返回列表
        </button>
      </div>
    </div>
  )
}
