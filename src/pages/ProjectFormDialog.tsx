import { useState } from 'react'
import type { Project, ProjectLink } from '../types'
import { Dialog } from '../components/Dialog'
import { LinkRowsEditor } from '../components/LinkRowsEditor'
import { TagInput } from '../components/TagInput'
import { Button, Field, Input, Textarea } from '../components/ui'
import { useStore } from '../store'
import { useToast } from '../toast'
import { isValidHttpUrl, uid } from '../utils'

interface Draft {
  name: string
  tagline: string
  tech: string[]
  links: ProjectLink[]
}

const emptyDraft = (): Draft => ({ name: '', tagline: '', tech: [], links: [{ id: uid(), label: '', href: '' }] })

export function ProjectFormDialog({
  open,
  project,
  onClose,
}: {
  open: boolean
  /** null 表示新增 */
  project: Project | null
  onClose: () => void
}) {
  const { dispatch } = useStore()
  const toast = useToast()
  const isEdit = project !== null

  const [draft, setDraft] = useState<Draft>(
    project
      ? {
          name: project.name,
          tagline: project.tagline,
          tech: project.tech,
          links: project.links.map((l) => ({ ...l })),
        }
      : emptyDraft(),
  )
  const [errors, setErrors] = useState<{
    name?: string
    tagline?: string
    linkErrors: Record<string, string>
    linkContainer?: string
  }>({ linkErrors: {} })
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (key !== 'links') setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const linkErrors: Record<string, string> = {}
    let validRows = 0

    const onlyRow = draft.links.length === 1
    for (const link of draft.links) {
      const label = link.label.trim()
      const href = link.href.trim()
      if (!label && !href) {
        // 整行为空：仅剩唯一一行时必须补全，否则忽略该空行
        if (onlyRow) {
          linkErrors[link.id] = '请填写按钮名称与链接地址'
        }
        continue
      }
      if (!label) linkErrors[link.id] = '请填写按钮名称'
      if (!href) linkErrors[link.id] = '请填写链接地址'
      else if (!isValidHttpUrl(href)) linkErrors[link.id] = '需以 http(s):// 开头'
      if (!linkErrors[link.id]) validRows += 1
    }

    const next = {
      name: draft.name.trim() ? undefined : '项目名称不能为空',
      tagline: draft.tagline.trim() ? undefined : '一句话简介不能为空',
      linkErrors,
      linkContainer: validRows === 0 ? '请至少添加一条可跳转的项目外链（如 GitHub）' : undefined,
    }
    setErrors(next)
    return !next.name && !next.tagline && Object.keys(linkErrors).length === 0 && validRows > 0
  }

  const save = async () => {
    if (!validate() || saving) return

    const payload: Project = {
      name: draft.name.trim(),
      tagline: draft.tagline.trim(),
      tech: draft.tech,
      links: draft.links
        .filter((l) => l.label.trim() && l.href.trim())
        .map((l) => ({ id: l.id, label: l.label.trim(), href: l.href.trim() })),
      id: isEdit && project ? project.id : uid(),
    }

    setSaving(true)
    try {
      if (isEdit) {
        await dispatch({ type: 'project/update', project: payload })
        toast.success(`项目「${payload.name}」已保存`)
      } else {
        await dispatch({ type: 'project/add', project: payload })
        toast.success(`项目「${payload.name}」已添加`)
      }
      onClose()
    } catch (err) {
      console.error('[project] 保存失败：', err)
      toast.danger('保存失败：云端写入被拒绝，请确认登录状态与数据库权限')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? '编辑项目' : '新增项目'}
      subtitle={
        isEdit
          ? '修改后保存，项目卡片与外链按钮会立即更新。'
          : '填写项目信息并配置外链（GitHub / Demo 等），保存后即出现在项目列表中。'
      }
    >
      <div className="space-y-4">
        <Field label="项目名称" required error={errors.name}>
          <Input
            autoFocus
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="例如：luoji-home"
            maxLength={60}
          />
        </Field>

        <Field label="一句话简介" required error={errors.tagline}>
          <Textarea
            rows={2}
            value={draft.tagline}
            onChange={(e) => set('tagline', e.target.value)}
            placeholder="用一句话描述这个项目做了什么、解决了什么问题。"
            maxLength={120}
          />
        </Field>

        <Field label="技术标签" hint="可选，输入后按回车添加；将展示在项目卡片上。">
          <TagInput
            value={draft.tech}
            onChange={(tech) => set('tech', tech)}
            placeholder="如：TypeScript、React、Vite"
          />
        </Field>

        <Field label="项目外链" required hint="支持 GitHub、在线 Demo、文档站等，保存后作为按钮展示并可点击跳转。">
          <LinkRowsEditor
            links={draft.links}
            onChange={(links) => set('links', links)}
            errors={errors.linkErrors}
            containerError={errors.linkContainer}
          />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : isEdit ? '保存修改' : '添加项目'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
