import { useState } from 'react'
import { ExternalLink, Loader2, RotateCcw, Save } from 'lucide-react'
import { SyncErrorBanner } from '../../components/AdminLayout'
import { TagInput } from '../../components/TagInput'
import { Button, Chip, Field, Input, PageHead, Textarea } from '../../components/ui'
import { SITE } from '../../lib/site'
import { useStore } from '../../store'
import { useToast } from '../../toast'
import { isValidHttpUrl } from '../../utils'
import type { SiteProfile } from '../../types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 站点配置：编辑展示站点的基础资料（存云端 site_profile 单行表） */
export function ProfilePage() {
  const { site, dispatch } = useStore()
  const toast = useToast()

  const [draft, setDraft] = useState<SiteProfile>(site)
  const [errors, setErrors] = useState<Partial<Record<keyof SiteProfile, string>>>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof SiteProfile>(key: K, value: SiteProfile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!draft.name.trim()) next.name = '姓名不能为空'
    if (!draft.en.trim()) next.en = '英文标识不能为空'
    if (!draft.role.trim()) next.role = '定位不能为空'
    if (!draft.headline.trim()) next.headline = '一句话简介不能为空'
    if (!draft.intro.trim()) next.intro = '个人简介不能为空'
    if (draft.github.trim() && !isValidHttpUrl(draft.github.trim())) {
      next.github = '需以 http(s):// 开头，留空表示不展示'
    }
    if (draft.email.trim() && !EMAIL_RE.test(draft.email.trim())) {
      next.email = '邮箱格式不正确，留空表示不展示'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!validate() || saving) return
    setSaving(true)
    try {
      await dispatch({
        type: 'site/save',
        site: {
          ...draft,
          name: draft.name.trim(),
          en: draft.en.trim(),
          role: draft.role.trim(),
          headline: draft.headline.trim(),
          intro: draft.intro.trim(),
          github: draft.github.trim(),
          email: draft.email.trim(),
        },
      })
      toast.success('站点配置已保存，展示站点刷新后生效')
    } catch (err) {
      console.error('[site] 保存失败：', err)
      toast.danger('保存失败：云端写入被拒绝，请确认登录状态与数据库权限')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setDraft(site)
    setErrors({})
    toast.info('已恢复为当前生效的配置')
  }

  const useDefaults = () => {
    setDraft(SITE)
    setErrors({})
    toast.info('已填入内置默认值，记得点保存')
  }

  return (
    <div>
      <SyncErrorBanner />

      <PageHead
        kicker="PROFILE"
        title="站点配置"
        desc="展示站点（首页 / 关于 / 页脚）读取这里的资料。保存后刷新展示站点即可看到变化。"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={reset} disabled={saving}>
              <RotateCcw size={15} /> 还原
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? '保存中…' : '保存'}
            </Button>
          </>
        }
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* 表单 */}
        <div className="space-y-5 rounded-2xl border border-line bg-surface p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="姓名" required error={errors.name}>
              <Input
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                maxLength={20}
                placeholder="如：罗辑"
              />
            </Field>
            <Field label="英文标识" required error={errors.en} hint="展示在姓名下方的小字">
              <Input
                value={draft.en}
                onChange={(e) => set('en', e.target.value)}
                maxLength={24}
                placeholder="如：LUOJI"
              />
            </Field>
          </div>

          <Field label="定位" required error={errors.role}>
            <Input
              value={draft.role}
              onChange={(e) => set('role', e.target.value)}
              maxLength={60}
              placeholder="如：Software Engineer · 软件工程"
            />
          </Field>

          <Field label="一句话简介" required error={errors.headline}>
            <Input
              value={draft.headline}
              onChange={(e) => set('headline', e.target.value)}
              maxLength={60}
              placeholder="如：写代码，也写文章。"
            />
          </Field>

          <Field label="个人简介" required error={errors.intro}>
            <Textarea
              rows={3}
              value={draft.intro}
              onChange={(e) => set('intro', e.target.value)}
              maxLength={240}
              placeholder="一段自我介绍，展示在首页与关于页。"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GitHub 地址" error={errors.github} hint="留空则不展示该入口">
              <Input
                value={draft.github}
                onChange={(e) => set('github', e.target.value)}
                placeholder="https://github.com/your-name"
              />
            </Field>
            <Field label="联系邮箱" error={errors.email} hint="留空则不展示该入口">
              <Input
                value={draft.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
          </div>

          <Field label="技能栈" hint="输入后按回车或逗号添加；展示在关于页">
            <TagInput
              value={draft.tech}
              onChange={(tech) => set('tech', tech)}
              placeholder="如：TypeScript、React"
            />
          </Field>

          <Field label="版权起始年份" hint="页脚显示为「© 起始年份 姓名 · 定位」">
            <Input
              type="number"
              min={2000}
              max={2100}
              value={String(draft.startYear)}
              onChange={(e) => set('startYear', Number(e.target.value) || SITE.startYear)}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
            <Button variant="ghost" size="sm" onClick={useDefaults} disabled={saving}>
              填入内置默认值
            </Button>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] text-ink-soft transition-colors hover:bg-canvas-soft hover:text-ink"
            >
              <ExternalLink size={15} /> 预览展示站点
            </a>
          </div>
        </div>

        {/* 实时预览 */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <p className="font-mono text-xs tracking-[0.22em] text-ink-faint uppercase">预览</p>
          <div className="mt-3 rounded-2xl border border-line bg-surface p-6">
            <p className="font-mono text-xs tracking-[0.25em] text-ink-faint uppercase">
              {draft.en || '—'} · {draft.role || '—'}
            </p>
            <p className="mt-4 text-[clamp(1.5rem,1.6vw_+_0.6rem,2rem)] font-bold leading-tight text-ink">
              你好，我是<span className="text-brand">{draft.name || '—'}</span>
            </p>
            <p className="mt-2 font-mono text-base text-ink-soft">{draft.headline || '—'}</p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">{draft.intro || '—'}</p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {draft.tech.length > 0 ? (
                draft.tech.map((t) => (
                  <Chip key={t} tone="brand">
                    {t}
                  </Chip>
                ))
              ) : (
                <span className="text-[13px] text-ink-faint">暂无技能标签</span>
              )}
            </div>
            <p className="mt-6 border-t border-line pt-4 font-mono text-xs text-ink-faint">
              © {draft.startYear} {draft.name || '—'} · {draft.role || '—'}
            </p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            提示：字段留空时展示站点会回退到内置默认值，不会出现空白页面。
          </p>
        </div>
      </div>
    </div>
  )
}
