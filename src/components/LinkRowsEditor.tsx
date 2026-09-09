import { Link2, Plus, X } from 'lucide-react'
import type { ProjectLink } from '../types'
import { cn, inputCls } from './ui'
import { uid } from '../utils'

/**
 * 项目外链编辑器：每个链接一行「名称 + 地址」，可新增行 / 删除行。
 * 地址以 http(s):// 开头（保存时由父级校验，errors 按行回填错误）。
 */
export function LinkRowsEditor({
  links,
  onChange,
  errors = {},
  containerError,
}: {
  links: ProjectLink[]
  onChange: (next: ProjectLink[]) => void
  errors?: Record<string, string>
  containerError?: string
}) {
  const patch = (id: string, field: 'label' | 'href', value: string) =>
    onChange(links.map((l) => (l.id === id ? { ...l, [field]: value } : l)))

  const remove = (id: string) => onChange(links.filter((l) => l.id !== id))

  const add = () => onChange([...links, { id: uid(), label: '', href: '' }])

  return (
    <div className="space-y-2">
      {links.length === 0 ? (
        <button
          type="button"
          onClick={add}
          className={cn(
            'focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3.5 text-sm text-ink-faint transition-colors hover:border-brand hover:text-brand',
            containerError && 'border-danger/50 text-danger',
          )}
        >
          <Plus size={16} /> 添加项目外链（如 GitHub / 在线 Demo）
        </button>
      ) : (
        links.map((link, index) => (
          <div key={link.id}>
            <div className="flex items-center gap-2">
              <div className="relative w-28 shrink-0 sm:w-32">
                <Link2
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-faint"
                />
                <input
                  value={link.label}
                  onChange={(e) => patch(link.id, 'label', e.target.value)}
                  placeholder={index === 0 ? 'GitHub' : '标签名'}
                  aria-label={`链接 ${index + 1} 名称`}
                  className={cn(inputCls, 'pl-8')}
                />
              </div>
              <input
                value={link.href}
                onChange={(e) => patch(link.id, 'href', e.target.value)}
                placeholder="https://github.com/…"
                aria-label={`链接 ${index + 1} 地址`}
                className={cn(inputCls, 'flex-1 font-mono text-[13px]')}
              />
              <button
                type="button"
                aria-label={`删除第 ${index + 1} 条链接`}
                disabled={links.length <= 1}
                onClick={() => remove(link.id)}
                className="focus-ring grid size-8 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-ink-faint">
                {index + 1}. 外链将以按钮形式展示在项目卡片上，点击在新标签页打开
              </p>
              {errors[link.id] && (
                <p className="shrink-0 text-[11px] text-danger">{errors[link.id]}</p>
              )}
            </div>
          </div>
        ))
      )}
      {links.length > 0 && (
        <button
          type="button"
          onClick={add}
          className="focus-ring mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand transition-colors hover:text-brand-strong"
        >
          <Plus size={15} /> 添加链接
        </button>
      )}
      {containerError && !links.some((l) => l.label.trim() || l.href.trim()) && (
        <p className="text-xs text-danger">{containerError}</p>
      )}
    </div>
  )
}
