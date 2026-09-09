import type { ReactNode } from 'react'
import { ArrowRight, FileText, FolderGit2, PenLine } from 'lucide-react'
import type { View } from '../types'
import { useStore } from '../store'
import { cn } from '../components/ui'
import { SITE } from '../lib/site'

/* ---------------- 数据概览卡 ---------------- */

function StatRow({
  icon,
  value,
  caption,
  valueClass,
  onClick,
}: {
  icon: ReactNode
  value: ReactNode
  caption: string
  valueClass?: string
  onClick?: () => void
}) {
  const cls =
    'focus-ring flex items-center gap-4 rounded-xl border border-line bg-surface px-5 py-5 text-left transition-colors hover:border-brand/60'
  const body = (
    <>
      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-ink', valueClass ?? 'font-mono text-3xl font-semibold leading-none')}>
          {value}
        </span>
        <span className="mt-2 block text-[0.9375rem] leading-relaxed text-ink-faint">{caption}</span>
      </span>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/* 全部由真实仓库驱动，未录入即为 0，不写死 */
function SiteStats({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { posts, projects } = useStore()
  return (
    <>
      <StatRow
        icon={<FileText size={20} />}
        value={posts.length}
        caption="篇文章 · 支持 Markdown"
        onClick={() => onNavigate('blog')}
      />
      <StatRow
        icon={<FolderGit2 size={20} />}
        value={projects.length}
        caption="个软件项目 · 一键跳转 GitHub"
        onClick={() => onNavigate('projects')}
      />
      <StatRow
        icon={<PenLine size={20} />}
        value="数据由你维护"
        caption="在「博客 / 项目」页点击新增即可录入，刷新页面后归零（内存仓库）"
        valueClass="text-sm font-semibold"
      />
    </>
  )
}

export function HomePage({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <div className="space-y-6">
      {/* Hero：窄屏单列；lg 起左右分栏，用站点数据面板填满右半屏 */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        {/* 极淡网格装饰 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage:
              'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(60% 70% at 70% 20%, #000 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(60% 70% at 70% 20%, #000 30%, transparent 75%)',
          }}
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          {/* 左：问候文案 */}
          <div className="min-w-0">
            <p className="font-mono text-[13px] tracking-[0.25em] text-ink-faint uppercase">
              {SITE.en} · {SITE.role}
            </p>
            <h1 className="mt-5 text-[clamp(2.5rem,3.2vw+1rem,4rem)] font-bold leading-[1.1] tracking-tight text-ink">
              你好，我是<span className="text-brand">{SITE.name}</span>
            </h1>
            <p className="mt-4 font-mono text-lg text-ink-soft">
              <span className="text-ink-faint">$</span> {SITE.headline}
            </p>
            {/* 正文：1.0625rem 起，随根字号放大，不再被固定 px 压回小字 */}
            <p className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
              {SITE.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('blog')}
                className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-6 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-brand-strong"
              >
                浏览博客 <ArrowRight size={17} />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-6 text-[15px] font-medium text-ink transition-colors hover:border-brand hover:text-brand"
              >
                查看项目 <FolderGit2 size={17} />
              </button>
            </div>
          </div>

          {/* 右：站点数据面板（仅 lg+ 展示，数据与下方窄屏区同一来源） */}
          <aside className="hidden min-w-0 lg:block">
            <div className="rounded-2xl border border-line/80 bg-canvas/50 p-6 xl:p-7">
              <p className="flex items-center gap-2 font-mono text-xs tracking-[0.22em] text-ink-faint uppercase">
                <span className="inline-block size-1.5 rounded-full bg-brand" />
                站点数据
              </p>
              <div className="mt-5 grid gap-3">
                <SiteStats onNavigate={onNavigate} />
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* 窄屏数据概览（lg 以下展示，样式与原布局一致） */}
      <section className="grid gap-4 sm:grid-cols-3 lg:hidden">
        <SiteStats onNavigate={onNavigate} />
      </section>
    </div>
  )
}
