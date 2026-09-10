import { useState } from 'react'
import { ArrowLeft, CalendarDays, Clock3, Pencil, Trash2 } from 'lucide-react'
import type { Post } from '../types'
import { ConfirmDialog } from '../components/Dialog'
import { Chip } from '../components/ui'
import { MarkdownRenderer } from '../lib/markdown'
import { useStore } from '../store'
import { useToast } from '../toast'
import { fmtDate, readingMinutes } from '../utils'

export function PostReader({
  post,
  onBack,
  onEdit,
}: {
  post: Post
  onBack: () => void
  onEdit: (p: Post) => void
}) {
  const { dispatch } = useStore()
  const toast = useToast()
  const [askDelete, setAskDelete] = useState(false)

  const doDelete = () => {
    dispatch({ type: 'post/delete', ids: [post.id] })
    toast.success(`文章《${post.title}》已删除`)
    setAskDelete(false)
    onBack()
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* 顶栏 */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[15px] text-ink-soft transition-colors hover:bg-canvas-soft hover:text-ink"
        >
          <ArrowLeft size={17} /> 返回文章列表
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(post)}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[15px] text-ink-soft transition-colors hover:bg-canvas-soft hover:text-ink"
          >
            <Pencil size={15} /> 编辑
          </button>
          <button
            type="button"
            onClick={() => setAskDelete(true)}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[15px] text-danger transition-colors hover:bg-danger-soft"
          >
            <Trash2 size={15} /> 删除
          </button>
        </div>
      </div>

      {/* 文章主体 */}
      <article className="mt-7 rounded-2xl border border-line bg-surface px-7 py-10 shadow-sm sm:px-12">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            {post.category && <Chip tone="brand">{post.category}</Chip>}
            {post.isSample && <Chip tone="warn">示例 · 可删除</Chip>}
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

      <ConfirmDialog
        open={askDelete}
        title="删除文章"
        message={`将删除文章《${post.title}》，删除后不可恢复，确定继续吗？`}
        onCancel={() => setAskDelete(false)}
        onConfirm={doDelete}
      />
    </div>
  )
}
