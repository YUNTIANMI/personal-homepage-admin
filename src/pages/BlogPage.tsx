import { useMemo, useState } from 'react'
import { BookOpen, FileText, Search, X } from 'lucide-react'
import type { Post } from '../types'
import { Button, Chip, EmptyState, IconBtn, PageHead } from '../components/ui'
import { useStore } from '../store'
import { fmtDate } from '../utils'

/** 博客列表（展示站点）：只读，搜索 + 阅读；内容统一在后台 /admin 发布 */
export function BlogPage({ onRead }: { onRead: (p: Post) => void }) {
  const { posts } = useStore()
  const [query, setQuery] = useState('')

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

  return (
    <div className="space-y-6">
      <PageHead kicker="Blog · Markdown Powered" title="博客文章" />

      {/* 搜索 */}
      <div className="relative min-w-0">
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

      {/* 列表 */}
      {filtered.length === 0 ? (
        posts.length === 0 ? (
          <EmptyState
            icon={<FileText size={22} />}
            title="暂无文章"
            desc="这里会展示作者发布的技术文章，请稍后再来看看。"
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
          <div className="px-1 lg:col-span-2">
            <span className="font-mono text-[13px] text-ink-faint">
              共 {posts.length} 篇 · 显示 {filtered.length} 篇
            </span>
          </div>

          {filtered.map((post) => (
            <article
              key={post.id}
              className="group rounded-xl border border-line bg-surface px-5 py-4 transition-colors duration-150 hover:border-line-strong"
            >
              <div className="flex items-start gap-3">
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
                <div className="flex shrink-0 items-center pt-0.5">
                  <IconBtn label="阅读全文" onClick={() => onRead(post)}>
                    <BookOpen size={16} />
                  </IconBtn>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
