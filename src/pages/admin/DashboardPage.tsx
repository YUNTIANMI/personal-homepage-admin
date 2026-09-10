import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, FileText, FolderKanban, Loader2, Plus } from 'lucide-react'
import { SyncErrorBanner } from '../../components/AdminLayout'
import { Button, EmptyState, PageHead, cn } from '../../components/ui'
import { useStore } from '../../store'

/** 统计卡片 */
function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number
  tone: 'brand' | 'ok'
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            'grid size-11 place-items-center rounded-xl',
            tone === 'brand' ? 'bg-brand-soft text-brand' : 'bg-ok-soft text-ok',
          )}
        >
          {icon}
        </span>
        <span className="font-mono text-[2.25rem] leading-none font-bold text-ink tabular-nums">
          {value}
        </span>
      </div>
      <p className="mt-4 text-[0.9375rem] text-ink-soft">{label}</p>
    </div>
  )
}

/** 把 'yyyy-mm-dd' 或 ISO 时间串统一成可比较的毫秒数（无法解析返回 0） */
function toTime(value?: string): number {
  if (!value) return 0
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

/** 展示时间：日期串只显示日期，ISO 时间戳显示到分钟 */
function fmtWhen(value: string): string {
  if (!value) return '—'
  const iso = value.length === 10 ? `${value}T00:00:00` : value
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return value
  const opts: Intl.DateTimeFormatOptions =
    value.length === 10
      ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
  return d.toLocaleString('zh-CN', opts)
}

export function DashboardPage() {
  const { posts, projects, cloudEnabled, syncStatus } = useStore()
  const navigate = useNavigate()

  const recent = useMemo(() => {
    const items = [
      ...posts.map((p) => ({
        id: `post-${p.id}`,
        kind: 'post' as const,
        title: p.title || '（无标题）',
        at: p.updated_at ?? p.created_at ?? p.date ?? '',
      })),
      ...projects.map((j) => ({
        id: `project-${j.id}`,
        kind: 'project' as const,
        title: j.name || '（未命名项目）',
        at: j.updated_at ?? j.created_at ?? '',
      })),
    ]
    return items.sort((a, b) => toTime(b.at) - toTime(a.at)).slice(0, 6)
  }, [posts, projects])

  return (
    <div>
      <SyncErrorBanner />

      <PageHead
        kicker="DASHBOARD"
        title="仪表盘"
        desc="内容总览与云端连接状态。文章与项目的改动会实时同步到前台站点。"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/projects?new=1')}>
              <Plus size={15} /> 新增项目
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/posts?new=1')}>
              <Plus size={15} /> 新增文章
            </Button>
          </>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<FileText size={20} />} label="文章总数" value={posts.length} tone="brand" />
        <StatCard
          icon={<FolderKanban size={20} />}
          label="项目总数"
          value={projects.length}
          tone="ok"
        />
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-canvas-soft text-ink-soft">
            {syncStatus === 'loading' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Clock size={20} />
            )}
          </span>
          <p className="mt-4 text-[0.9375rem] text-ink-soft">云端连接</p>
          <p
            className={cn(
              'mt-1 text-[1.0625rem] font-semibold',
              !cloudEnabled
                ? 'text-ink-faint'
                : syncStatus === 'error'
                  ? 'text-danger'
                  : 'text-ink',
            )}
          >
            {!cloudEnabled
              ? '未启用（本地模式）'
              : syncStatus === 'loading'
                ? '同步中…'
                : syncStatus === 'error'
                  ? '同步失败'
                  : '已连接'}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-ink">最近更新</h2>
        <p className="mt-1 text-sm text-ink-faint">按云端更新时间排序（未写入时间戳时回退为文章日期）。</p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
          {recent.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<FileText size={22} />}
                title="还没有任何内容"
                desc="创建第一篇文章或第一个项目，开始搭建你的个人主页。"
                action={
                  <Button variant="primary" size="sm" onClick={() => navigate('/admin/posts?new=1')}>
                    <Plus size={15} /> 新增文章
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(item.kind === 'post' ? '/admin/posts' : '/admin/projects')
                    }
                    className="focus-ring flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-canvas-soft sm:px-5"
                  >
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-lg',
                        item.kind === 'post'
                          ? 'bg-brand-soft text-brand'
                          : 'bg-ok-soft text-ok',
                      )}
                    >
                      {item.kind === 'post' ? <FileText size={16} /> : <FolderKanban size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium text-ink">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-ink-faint">
                        {item.kind === 'post' ? '文章' : '项目'}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-ink-faint">
                      {fmtWhen(item.at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
