import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from './ui'

/** 通用对话框：背板点击 / ESC / 关闭按钮均可关闭 */
export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
  ariaLabel,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  size?: 'md' | 'lg' | 'xl'
  children: ReactNode
  ariaLabel?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const widthMap = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-3xl' }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || (typeof title === 'string' ? title : '对话框')}
    >
      <div
        className="fixed inset-0 bg-[#0a0f16]/45 backdrop-blur-[2px]"
        onMouseDown={onClose}
      />
      <div
        className={cn(
          'relative my-auto w-full rounded-2xl border border-line bg-surface shadow-2xl shadow-[#0a0f16]/15',
          widthMap[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-1 text-[0.875rem] text-ink-faint">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="关闭弹窗"
            onClick={onClose}
            className="focus-ring grid size-8 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-canvas-soft hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/** 危险操作确认框 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '删除',
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmText?: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} size="md">
      <div className="text-sm leading-relaxed text-ink-soft">{message}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-line-strong px-4 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="focus-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-danger px-4 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90"
          onClick={onConfirm}
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
            <path
              d="M2 4h12M6.5 4V2.8A.8.8 0 017.3 2h1.4a.8.8 0 01.8.8V4M4 4l.7 9a1 1 0 001 .9h4.6a1 1 0 001-.9L12 4M6.7 7v4.4M9.3 7v4.4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          {confirmText}
        </button>
      </div>
    </Dialog>
  )
}
