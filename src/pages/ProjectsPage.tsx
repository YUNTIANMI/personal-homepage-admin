import { useState } from 'react'
import { ExternalLink, FolderGit2, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Project } from '../types'
import { ConfirmDialog } from '../components/Dialog'
import {
  Button,
  Checkbox,
  Chip,
  EmptyState,
  IconBtn,
  PageHead,
  cn,
} from '../components/ui'
import { useStore } from '../store'
import { useToast } from '../toast'
import { ProjectFormDialog } from './ProjectFormDialog'

export function ProjectsPage() {
  const { projects, dispatch } = useStore()
  const toast = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editor, setEditor] = useState<Project | null | undefined>(undefined) // undefined=关闭
  const [confirmIds, setConfirmIds] = useState<string[]>([])
  const [confirmMessage, setConfirmMessage] = useState('')

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const doDelete = (ids: string[]) => {
    const names = projects.filter((p) => ids.includes(p.id)).map((p) => p.name)
    setConfirmIds(ids)
    setConfirmMessage(
      ids.length === 1
        ? `将删除项目「${names[0]}」，删除后不可恢复，确定继续吗？`
        : `将删除选中的 ${ids.length} 个项目（「${names[0]}」等），删除后不可恢复，确定继续吗？`,
    )
  }

  const executeDelete = () => {
    dispatch({ type: 'project/delete', ids: confirmIds })
    toast.success(confirmIds.length === 1 ? '项目已删除' : `已删除 ${confirmIds.length} 个项目`)
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
      <PageHead kicker="Projects · Open Source" title="软件项目" />

      {/* 工具条 */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="mr-auto font-mono text-[13px] text-ink-faint">共 {projects.length} 个项目</span>
        {selected.size > 0 && (
          <>
            <span className="rounded-lg border border-brand/40 bg-brand-soft px-3.5 py-2.5 text-[15px] text-brand">
              已选 <span className="font-mono">{selected.size}</span> 项
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              清除选择
            </Button>
            <Button variant="danger" size="md" onClick={() => doDelete([...selected])}>
              <Trash2 size={15} /> 批量删除
            </Button>
          </>
        )}
        <Button variant="primary" onClick={() => setEditor(null)}>
          <Plus size={16} /> 新增项目
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 size={22} />}
          title="还没有项目"
          desc="列表当前为空。点击「新增项目」，录入项目名称、简介与技术标签，并添加 GitHub / Demo 外链，保存后即可在此展示与跳转。"
          action={
            <Button variant="primary" onClick={() => setEditor(null)}>
              <Plus size={16} /> 添加第一个项目
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {projects.map((project) => {
            const checked = selected.has(project.id)
            return (
              <article
                key={project.id}
                className={cn(
                  'flex flex-col rounded-xl border bg-surface p-5 transition-colors duration-150',
                  checked ? 'border-brand/60 shadow-sm' : 'border-line hover:border-line-strong',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={checked}
                    onChange={() => toggleOne(project.id)}
                    label={undefined}
                  />
                  <h3 className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold text-ink">
                    {project.name}
                  </h3>
                  {project.isSample && <Chip tone="warn">示例</Chip>}
                  <div className="flex shrink-0 items-center">
                    <IconBtn label="编辑项目" onClick={() => setEditor(project)}>
                      <Pencil size={15} />
                    </IconBtn>
                    <IconBtn
                      label="删除项目"
                      className="hover:bg-danger-soft hover:text-danger"
                      onClick={() => doDelete([project.id])}
                    >
                      <Trash2 size={15} />
                    </IconBtn>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {project.tagline}
                </p>

                {project.tech.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {project.tech.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                )}

                {project.links.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                    {project.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${link.label} · ${link.href}`}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas-soft px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-colors duration-150 hover:border-brand hover:bg-brand-soft hover:text-brand"
                      >
                        {link.label || '链接'}
                        <ExternalLink size={12} />
                      </a>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {editor !== undefined && (
        <ProjectFormDialog open project={editor} onClose={() => setEditor(undefined)} />
      )}

      <ConfirmDialog
        open={confirmIds.length > 0}
        title="删除确认"
        message={confirmMessage}
        confirmText={confirmIds.length > 1 ? `删除 ${confirmIds.length} 项` : '删除'}
        onCancel={() => {
          setConfirmIds([])
          setConfirmMessage('')
        }}
        onConfirm={executeDelete}
      />
    </div>
  )
}
