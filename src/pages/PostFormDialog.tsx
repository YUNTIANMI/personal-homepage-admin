import { useMemo, useState } from 'react'
import { CalendarDays, Eye, PenLine } from 'lucide-react'
import type { Post } from '../types'
import { Dialog } from '../components/Dialog'
import { TagInput } from '../components/TagInput'
import { Button, Field, Input, Textarea, cn } from '../components/ui'
import { MarkdownRenderer } from '../lib/markdown'
import { useStore } from '../store'
import { useToast } from '../toast'
import { todayISO, uid } from '../utils'

export interface PostDraft {
  title: string
  date: string
  category: string
  tags: string[]
  description: string
  content: string
}

const emptyDraft = (): PostDraft => ({
  title: '',
  date: todayISO(),
  category: '',
  tags: [],
  description: '',
  content: '',
})

export function PostFormDialog({
  open,
  post,
  onClose,
}: {
  open: boolean
  /** null 表示新增，否则编辑回填 */
  post: Post | null
  onClose: () => void
}) {
  const { dispatch } = useStore()
  const toast = useToast()

  const isEdit = post !== null
  const [draft, setDraft] = useState<PostDraft>(post ? pick(post) : emptyDraft())
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [errors, setErrors] = useState<Partial<Record<keyof PostDraft, string>>>({})
  const [saving, setSaving] = useState(false)

  function pick(p: Post): PostDraft {
    return {
      title: p.title,
      date: p.date,
      category: p.category,
      tags: p.tags,
      description: p.description,
      content: p.content,
    }
  }

  const set = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const canPreview = useMemo(() => draft.content.trim().length > 0, [draft.content])

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!draft.title.trim()) next.title = '标题不能为空'
    if (!draft.date) next.date = '请选择日期'
    else if (Number.isNaN(new Date(`${draft.date}T00:00:00`).getTime()))
      next.date = '日期格式不正确'
    if (!draft.content.trim()) next.content = '正文不能为空'
    else if (draft.content.trim().length < 6) next.content = '正文太短，请至少输入 6 个字符'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!validate() || saving) return

    const payload: Post = {
      ...draft,
      id: isEdit && post ? post.id : uid(),
      title: draft.title.trim(),
      category: draft.category.trim(),
      description: draft.description.trim(),
    }

    setSaving(true)
    try {
      if (isEdit) {
        await dispatch({ type: 'post/update', post: payload })
        toast.success(`文章《${payload.title}》已保存`)
      } else {
        await dispatch({ type: 'post/add', post: payload })
        toast.success('文章已发布')
      }
      onClose()
    } catch (err) {
      console.error('[post] 保存失败：', err)
      toast.danger('保存失败：云端写入被拒绝，请确认登录状态与数据库权限')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? '编辑文章' : '新增文章'}
      subtitle={
        isEdit ? '修改内容后保存，列表与阅读页会立即刷新。' : '正文使用 Markdown 编写，发布后自动渲染。'
      }
    >
      <div className="space-y-4">
        <Field label="标题" required error={errors.title}>
          <Input
            autoFocus
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="例如：深入理解 React 渲染调度"
            maxLength={80}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="日期" required error={errors.date}>
            <div className="relative">
              <CalendarDays
                size={15}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="date"
                value={draft.date}
                onChange={(e) => set('date', e.target.value)}
                className={cn('input-base', 'pl-9')}
                aria-label="日期"
              />
            </div>
          </Field>
          <Field label="分类" error={errors.category}>
            <Input
              value={draft.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="如：前端工程 / 算法 / 随笔"
              maxLength={20}
            />
          </Field>
        </div>

        <Field label="标签" hint="输入后按回车或逗号添加，可点 × 删除">
          <TagInput value={draft.tags} onChange={(tags) => set('tags', tags)} />
        </Field>

        <Field label="摘要" hint="可选，显示在文章列表中；留空则自动截取正文开头。">
          <Textarea
            rows={2}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="用一句话概括这篇文章……"
            maxLength={140}
          />
        </Field>

        <Field label="正文（Markdown）" required error={errors.content}>
          <div className="space-y-1.5">
            <div
              role="tablist"
              aria-label="正文编辑模式"
              className="inline-flex rounded-lg border border-line bg-canvas-soft p-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'write'}
                onClick={() => setTab('write')}
                className={cn(
                  'focus-ring inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  tab === 'write' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint hover:text-ink',
                )}
              >
                <PenLine size={13} /> 编写
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'preview'}
                disabled={!canPreview}
                onClick={() => setTab('preview')}
                className={cn(
                  'focus-ring inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  tab === 'preview' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint hover:text-ink',
                  !canPreview && 'opacity-45',
                )}
              >
                <Eye size={13} /> 预览
              </button>
            </div>

            {tab === 'write' ? (
              <Textarea
                rows={14}
                value={draft.content}
                onChange={(e) => set('content', e.target.value)}
                placeholder={'支持标题、列表、表格、引用、代码块高亮等 GFM 语法\n\n## 开始写作……'}
                className="font-mono text-[13px] leading-relaxed"
              />
            ) : canPreview ? (
              <div className="max-h-105 overflow-y-auto rounded-lg border border-line bg-surface p-4">
                <MarkdownRenderer content={draft.content} />
              </div>
            ) : null}
          </div>
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : isEdit ? '保存修改' : '发布文章'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
