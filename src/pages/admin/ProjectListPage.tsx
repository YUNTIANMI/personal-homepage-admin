import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDownUp,
  ExternalLink,
  FolderKanban,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { SyncErrorBanner } from '../../components/AdminLayout'
import { ConfirmDialog } from '../../components/Dialog'
import { Button, Chip, EmptyState, IconBtn, PageHead, cn } from '../../components/ui'
import { ProjectFormDialog } from '../ProjectFormDialog'
import { useStore } from '../../store'
import { useToast } from '../../toast'
import type { Project } from '../../types'

export function ProjectListPage() {
  const { projects, dispatch, cloudEnabled, syncStatus } = useStore()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [editor, setEditor] = useState<{ project: Project | null } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)

  // 仪表盘「新增项目」快捷入口：?new=1 → 打开新增弹窗并清掉参数
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditor({ project: null })
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? projects.filter((j) =>
          [j.name, j.tagline, (j.tech ?? []).join(' ')].join(' ').toLowerCase().includes(q),
        )
      : projects
    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') * dir)
  }, [projects, query, sortDir])

  const confirmDelete = async () => {
    const target = pendingDelete
    if (!target) return
    setPendingDelete(null)
    try {
      await dispatch({ type: 'project/delete', ids: [target.id] })
      toast.success(`项目「${target.name}」已删除`)
    } catch (err) {
      console.error('[project] 删除失败：', err)
      toast.danger('删除失败：云端写入被拒绝，请确认登录状态与数据库权限')
    }
  }

  const isLoading = cloudEnabled && syncStatus === 'loading' && projects.length === 0

  return (
    <div>
      <SyncErrorBanner />

      <PageHead
        kicker="PROJECTS"
        title="项目管理"
        desc="维护作品集卡片与外链（GitHub / 在线 Demo / 文档站），保存后立即同步到前台。"
        actions={
          <Button variant="primary" size="sm" onClick={() => setEditor({ project: null })}>
            <Plus size={15} /> 新增项目
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
            placeholder="搜索项目名称或技术标签…"
            aria-label="搜索项目"
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

        <button
          type="button"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          title={sortDir === 'asc' ? '按名称升序，点击切换降序' : '按名称降序，点击切换升序'}
          aria-label={sortDir === 'asc' ? '切换为降序' : '切换为升序'}
          className="focus-ring inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink-soft transition-colors hover:border-brand hover:text-brand"
        >
          <ArrowDownUp size={16} />
          名称{sortDir === 'asc' ? '升序' : '降序'}
        </button>
      </div>

      {/* 列表 */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-ink-faint">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">正在加载项目…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            {projects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban size={22} />}
                title="还没有项目"
                desc="添加第一个项目，配置 GitHub / Demo 外链后即可在前台展示。"
                action={
                  <Button variant="primary" size="sm" onClick={() => setEditor({ project: null })}>
                    <Plus size={15} /> 新增项目
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Search size={22} />}
                title="没有匹配的项目"
                desc="换一个关键词试试，或清除搜索条件查看全部项目。"
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
            <table className="w-full min-w-180 border-collapse text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-line bg-canvas-soft/60 text-sm text-ink-soft">
                  <th className="min-w-48 px-4 py-3 font-medium">项目名称</th>
                  <th className="min-w-72 px-4 py-3 font-medium">一句话简介</th>
                  <th className="min-w-40 px-4 py-3 font-medium">技术标签</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">外链</th>
                  <th className="w-28 px-4 py-3 text-right font-medium whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => {
                  const tech = project.tech ?? []
                  const links = project.links ?? []
                  return (
                    <tr
                      key={project.id}
                      className="border-b border-line align-top transition-colors last:border-b-0 hover:bg-canvas-soft/50"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink">{project.name || '（未命名）'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-ink-soft">
                        <span className="line-clamp-2">{project.tagline || '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {tech.length === 0 ? (
                          <span className="text-ink-faint">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {tech.slice(0, 3).map((t) => (
                              <Chip key={t} tone="brand">
                                {t}
                              </Chip>
                            ))}
                            {tech.length > 3 && <Chip>+{tech.length - 3}</Chip>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-ink-soft">
                          <ExternalLink size={14} className="text-ink-faint" />
                          {links.length} 条
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconBtn label="编辑" onClick={() => setEditor({ project })}>
                            <Pencil size={16} />
                          </IconBtn>
                          <IconBtn
                            label="删除"
                            className="hover:bg-danger-soft hover:text-danger"
                            onClick={() => setPendingDelete(project)}
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

      {filtered.length > 0 && (
        <p className="mt-4 font-mono text-xs text-ink-soft">共 {filtered.length} 个项目</p>
      )}

      {/* 新增 / 编辑 */}
      {editor && (
        <ProjectFormDialog
          open
          project={editor.project}
          onClose={() => setEditor(null)}
        />
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除项目"
        message={
          pendingDelete
            ? `确定要删除项目「${pendingDelete.name}」吗？删除后无法恢复。`
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
