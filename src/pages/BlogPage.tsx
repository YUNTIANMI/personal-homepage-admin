import { useMemo, useState } from 'react'
import { BookOpen, FileText, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import type { Post } from '../types'
import { ConfirmDialog } from '../components/Dialog'
import { Button, Chip, Checkbox, EmptyState, IconBtn, PageHead, cn } from '../components/ui'
import { useStore } from '../store'
import { useToast } from '../toast'
import { fmtDate } from '../utils'

export function BlogPage({
  onRead,
  onOpenEditor,
}: {
  onRead: (p: Post) => void
  /** null 表示新增文章 */
  onOpenEditor: (post: Post | null) => void
}) {
  const { posts, dispatch } = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmIds, setConfirmIds] = useState<string[]>([])
  const [confirmMessage, setConfirmMessage] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return posts
    return posts.filter((p) =>
      [p.title, p.category, p.description, p.tags.join(' '), p.content]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [posts, query])

  const visibleIds = filtered.map((p) => p.id)
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleChecked) {
        visibleIds.forEach((id) => next.delete(id))
      } else {
        visibleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const doDelete = (ids: string[]) => {
    const titles = posts.filter((p) => ids.includes(p.id)).map((p) => p.title)
    setConfirmIds(ids)
    setConfirmMessage(
      ids.length === 1
        ? `将删除文章《${titles[0]}》，删除后不可恢复，确定继续吗？`
        : `将删除选中的 ${ids.length} 篇文章（《${titles[0]}》等），删除后不可恢复，确定继续吗？`,
    )
  }

  const executeDelete = () => {
    dispatch({ type: 'post/delete', ids: confirmIds })
    toast.success(confirmIds.length === 1 ? '文章已删除' : `已删除 ${confirmIds.length} 篇文章`)
    setSelected((prev) => {
      const next = new Set(prev)
      confirmIds.forEach((id) => next.delete(id))
      return next
    })
    setConfirmIds([])
    setConfirmMessage('')
  }

  return (
    <div className="space-y-6">
      <PageHead
        kicker="// Blog · Markdown Powered"
        title="博客文章"
        desc="全部数据由下方列表管理：新增、编辑、单行删除与批量删除都会直接更新内存仓库并即时刷新。"
      />

      {/* 工具条 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题 / 摘要 / 标签 / 正文…"
            className="input-base pl-9"
            aria-label="搜索文章"
          />
          {query && (
            <button
              type="button"
              aria-label="清空搜索"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-faint hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-brand/40 bg-brand-soft px-3.5 py-2.5 text-[15px] text-brand">
            <span className="font-mono">{selected.size}</span> 项已选
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-1 text-[13px] underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              清除
            </button>
          </div>
        )}
        {selected.size > 0 && (
          <Button variant="danger" size="md" onClick={() => doDelete([...selected])}>
            <Trash2 size={15} /> 批量删除
          </Button>
        )}
        <Button variant="primary" onClick={() => onOpenEditor(null)}>
          <Plus size={16} /> 新增文章
        </Button>
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        posts.length === 0 ? (
          <EmptyState
            icon={<FileText size={22} />}
            title="还没有文章"
            desc="列表当前为空。点击右上角「新增文章」，填写标题与 Markdown 正文并发布，它就会出现在这里。"
            action={
              <Button variant="primary" onClick={() => onOpenEditor(null)}>
                <Plus size={16} /> 写第一篇
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Search size={22} />}
            title="没有匹配的文章"
            desc="换个关键词，或清空搜索框查看全部文章。"
            action={<Button onClick={() => setQuery('')}>清空搜索</Button>}
          />
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 表头选择行 */}
          <div className="flex items-center gap-3 px-1 lg:col-span-2">
            <Checkbox checked={allVisibleChecked} onChange={toggleAll} label="全选本页" />
            <span className="ml-auto font-mono text-[13px] text-ink-faint">
              {posts.length} 篇 / 显示 {filtered.length} 篇
            </span>
          </div>

          {filtered.map((post) => {
            const checked = selected.has(post.id)
            const sample = post.isSample === true
            return (
              <article
                key={post.id}
                className={cn(
                  'group rounded-xl border bg-surface px-5 py-4 transition-colors duration-150',
                  checked
                    ? 'border-brand/60 shadow-sm'
                    : 'border-line hover:border-line-strong',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <Checkbox checked={checked} onChange={() => toggleOne(post.id)} label={undefined} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <button
                        type="button"
                        onClick={() => onRead(post)}
                        title="阅读全文"
                        className="focus-ring max-w-full truncate text-left text-[0.9375rem] font-bold text-ink transition-colors hover:text-brand"
                      >
                        {post.title}
                      </button>
                      {sample && <Chip tone="warn">示例 · 可删除</Chip>}
                      {post.category && (
                        <Chip tone="neutral">
                          <span className="text-ink-faint">分类</span> {post.category}
                        </Chip>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                      {post.description ||
                        (post.content.replace(/[#>*`_\-]/g, '').slice(0, 90) + '…')}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 font-mono text-xs text-ink-faint">
                        {fmtDate(post.date)}
                      </span>
                      {post.tags.slice(0, 3).map((t) => (
                        <Chip key={t}>{t}</Chip>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="font-mono text-xs text-ink-faint">
                          +{post.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
                    <IconBtn label="阅读全文" onClick={() => onRead(post)}>
                      <BookOpen size={16} />
                    </IconBtn>
                    <IconBtn label="编辑文章" onClick={() => onOpenEditor(post)}>
                      <Pencil size={16} />
                    </IconBtn>
                    <IconBtn label="删除文章" className="hover:bg-danger-soft hover:text-danger" onClick={() => doDelete([post.id])}>
                      <Trash2 size={16} />
                    </IconBtn>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmIds.length > 0}
        title="删除确认"
        message={confirmMessage}
        confirmText={confirmIds.length > 1 ? `删除 ${confirmIds.length} 篇` : '删除'}
        onCancel={() => {
          setConfirmIds([])
          setConfirmMessage('')
        }}
        onConfirm={executeDelete}
      />
    </div>
  )
}
