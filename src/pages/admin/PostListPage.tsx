import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { SyncErrorBanner } from '../../components/AdminLayout'
import { ConfirmDialog, Dialog } from '../../components/Dialog'
import { Button, Chip, EmptyState, IconBtn, PageHead, cn } from '../../components/ui'
import { MarkdownRenderer } from '../../lib/markdown'
import { PostFormDialog } from '../PostFormDialog'
import { useStore } from '../../store'
import { useToast } from '../../toast'
import type { Post } from '../../types'
import { excerptOf } from '../../utils'

const PAGE_SIZE = 10

type SortKey = 'date' | 'updated' | 'title'

/** 表头全选框：支持 indeterminate（部分选中）状态 */
function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: (v: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label="全选本页"
      className="size-4 accent-brand"
    />
  )
}

/** 把 'yyyy-mm-dd' 或 ISO 时间串统一成可比较的毫秒数（无法解析返回 0） */
function toTime(value?: string): number {
  if (!value) return 0
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

function fmtDateShort(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function PostListPage() {
  const { posts, dispatch, cloudEnabled, syncStatus } = useStore()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updated')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number[]>([])

  /** undefined=关闭；post=null 表示新增 */
  const [editor, setEditor] = useState<{ post: Post | null } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<number[]>([])
  const [preview, setPreview] = useState<Post | null>(null)

  // 仪表盘「新增文章」快捷入口：?new=1 → 打开新增弹窗并清掉参数
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditor({ post: null })
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? posts.filter((p) =>
          [p.title, p.category, p.description, p.content, (p.tags ?? []).join(' ')]
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      : posts

    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title, 'zh-CN') * dir
      const av = sortKey === 'updated' ? toTime(a.updatedAt ?? a.createdAt ?? a.date) : toTime(a.date)
      const bv = sortKey === 'updated' ? toTime(b.updatedAt ?? b.createdAt ?? b.date) : toTime(b.date)
      return (av - bv) * dir
    })
  }, [posts, query, sortKey, sortDir])

  // 搜索 / 排序变化后回到第一页
  useEffect(() => {
    setPage(1)
  }, [query, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const pageIds = pageItems.map((p) => p.id)
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.includes(id))
  const someChecked = pageIds.some((id) => selected.includes(id))

  const toggleOne = (id: number, on: boolean) => {
    setSelected((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)))
  }
  const togglePage = (on: boolean) => {
    setSelected((prev) =>
      on ? Array.from(new Set([...prev, ...pageIds])) : prev.filter((id) => !pageIds.includes(id)),
    )
  }

  const confirmDelete = async () => {
    const ids = pendingDelete
    if (ids.length === 0) return
    setPendingDelete([])
    try {
      await dispatch({ type: 'post/delete', ids })
      setSelected((prev) => prev.filter((id) => !ids.includes(id)))
      toast.success(ids.length > 1 ? `已删除 ${ids.length} 篇文章` : '文章已删除')
    } catch (err) {
      console.error('[post] 删除失败：', err)
      toast.danger('删除失败：云端写入被拒绝，请确认登录状态与数据库权限')
    }
  }

  const isLoading = cloudEnabled && syncStatus === 'loading' && posts.length === 0

  return (
    <div>
      <SyncErrorBanner />

      <PageHead
        kicker="POSTS"
        title="文章管理"
        desc="管理站点全部文章。支持搜索、排序、批量删除，正文使用 Markdown 编写。"
        actions={
          <Button variant="primary" size="sm" onClick={() => setEditor({ post: null })}>
            <Plus size={15} /> 新增文章
          </Button>
        }
      />

      {/* 工具栏 */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题、分类、标签或正文…"
            aria-label="搜索文章"
            className={cn('input-base h-10 pl-9', query && 'pr-9')}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清除搜索"
              className="focus-ring absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-faint hover:text-ink"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="排序字段"
            className="input-base h-10 w-auto pr-8"
          >
            <option value="updated">按更新时间</option>
            <option value="date">按发布日期</option>
            <option value="title">按标题</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            title={sortDir === 'asc' ? '当前升序，点击切换降序' : '当前降序，点击切换升序'}
            aria-label={sortDir === 'asc' ? '切换为降序' : '切换为升序'}
            className="focus-ring grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-soft transition-colors hover:border-brand hover:text-brand"
          >
            <ArrowDownUp size={16} />
          </button>
        </div>

        {selected.length > 0 && (
          <Button
            variant="danger-ghost"
            size="sm"
            onClick={() => setPendingDelete(selected)}
          >
            <Trash2 size={15} /> 删除选中（{selected.length}）
          </Button>
        )}
      </div>

      {/* 列表 */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-ink-faint">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">正在加载文章…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            {posts.length === 0 ? (
              <EmptyState
                icon={<FileText size={22} />}
                title="还没有文章"
                desc="创建第一篇文章，发布后即可在站点上阅读。"
                action={
                  <Button variant="primary" size="sm" onClick={() => setEditor({ post: null })}>
                    <Plus size={15} /> 新增文章
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Search size={22} />}
                title="没有匹配的文章"
                desc="换一个关键词试试，或清除搜索条件查看全部文章。"
                action={
                  <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                    清除搜索
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 border-collapse text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-line bg-canvas-soft/60 text-sm text-ink-soft">
                  <th className="w-12 px-4 py-3">
                    <HeaderCheckbox
                      checked={allChecked}
                      indeterminate={!allChecked && someChecked}
                      onChange={togglePage}
                    />
                  </th>
                  <th className="min-w-56 px-4 py-3 font-medium">标题</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">日期</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">分类</th>
                  <th className="min-w-40 px-4 py-3 font-medium">标签</th>
                  <th className="min-w-64 px-4 py-3 font-medium">摘要</th>
                  <th className="w-28 px-4 py-3 text-right font-medium whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((post) => {
                  const checked = selected.includes(post.id)
                  const tags = post.tags ?? []
                  return (
                    <tr
                      key={post.id}
                      className={cn(
                        'border-b border-line align-top transition-colors last:border-b-0 hover:bg-canvas-soft/50',
                        checked && 'bg-brand-soft/40',
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleOne(post.id, e.target.checked)}
                          aria-label={`选择文章 ${post.title}`}
                          className="mt-0.5 size-4 accent-brand"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink">{post.title || '（无标题）'}</span>
                          {post.isSample && <Chip tone="warn">示例 · 可删除</Chip>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-sm whitespace-nowrap text-ink-soft">
                        {fmtDateShort(post.date)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-soft">
                        {post.category || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {tags.length === 0 ? (
                          <span className="text-ink-faint">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {tags.slice(0, 3).map((t) => (
                              <Chip key={t}>{t}</Chip>
                            ))}
                            {tags.length > 3 && <Chip tone="neutral">+{tags.length - 3}</Chip>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-ink-soft">
                        <span className="line-clamp-2">{excerptOf(post) || '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconBtn label="预览" onClick={() => setPreview(post)}>
                            <Eye size={16} />
                          </IconBtn>
                          <IconBtn label="编辑" onClick={() => setEditor({ post })}>
                            <Pencil size={16} />
                          </IconBtn>
                          <IconBtn
                            label="删除"
                            className="hover:bg-danger-soft hover:text-danger"
                            onClick={() => setPendingDelete([post.id])}
                          >
                            <Trash2 size={16} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页 */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
          <p className="font-mono text-xs">
            共 {filtered.length} 篇 · 第 {safePage} / {totalPages} 页
          </p>
          <div className="flex items-center gap-1">
            <IconBtn
              label="上一页"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={17} />
            </IconBtn>
            <IconBtn
              label="下一页"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={17} />
            </IconBtn>
          </div>
        </div>
      )}

      {/* 新增 / 编辑 */}
      {editor && (
        <PostFormDialog open post={editor.post} onClose={() => setEditor(null)} />
      )}

      {/* 预览 */}
      <Dialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.title || '文章预览'}
        subtitle={
          preview
            ? `${fmtDateShort(preview.date)} · ${preview.category || '未分类'}`
            : undefined
        }
        size="lg"
      >
        {preview && <MarkdownRenderer content={preview.content} />}
      </Dialog>

      {/* 删除确认 */}
      <ConfirmDialog
        open={pendingDelete.length > 0}
        title={pendingDelete.length > 1 ? '批量删除文章' : '删除文章'}
        message={
          pendingDelete.length > 1
            ? `确定要删除选中的 ${pendingDelete.length} 篇文章吗？删除后无法恢复。`
            : '确定要删除这篇文章吗？删除后无法恢复。'
        }
        onCancel={() => setPendingDelete([])}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
