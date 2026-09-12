import { forwardRef } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

export function cn(...xs: Array<string | false | undefined>): string {
  return xs.filter(Boolean).join(' ')
}

/* ---------------- Button ---------------- */
type BtnVariant = 'primary' | 'outline' | 'ghost' | 'danger-ghost'
type BtnSize = 'sm' | 'md'

const variantCls: Record<BtnVariant, string> = {
  primary:
    'bg-brand text-white shadow-sm hover:bg-brand-strong active:bg-brand-strong disabled:hover:bg-brand',
  outline:
    'border border-line-strong bg-surface text-ink hover:border-brand hover:text-brand disabled:hover:border-line-strong disabled:hover:text-ink',
  ghost: 'text-ink-soft hover:bg-canvas-soft hover:text-ink',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
}

const sizeCls: Record<BtnSize, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-sm',
  md: 'h-12 gap-2 px-6 text-base',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
}

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'focus-ring inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45',
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* 纯图标按钮 */
export function IconBtn({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'focus-ring inline-flex size-9 items-center justify-center rounded-md text-ink-faint transition-colors duration-150 hover:bg-canvas-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ---------------- 表单输入 ---------------- */
export const inputCls =
  'input-base min-w-0 h-11 text-base disabled:pointer-events-none disabled:opacity-50'

/* 用 forwardRef 暴露原生节点，便于在编辑器里做「光标处插入」等操作 */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return <input {...props} ref={ref} className={cn(inputCls, props.className)} />
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(props, ref) {
  return (
    <textarea {...props} ref={ref} className={cn(inputCls, 'leading-relaxed', props.className)} />
  )
})

export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-ink-soft">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-sm text-danger">
          <span className="inline-block size-1.5 rounded-full bg-danger" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-faint">{hint}</p>
      ) : null}
    </div>
  )
}

/* ---------------- Chip ---------------- */
export function Chip({
  children,
  tone = 'neutral',
  onRemove,
  title,
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'ok' | 'warn'
  onRemove?: () => void
  title?: string
}) {
  const toneCls: Record<string, string> = {
    neutral:
      'border-line bg-canvas-soft text-ink-soft',
    brand: 'border-brand/30 bg-brand-soft text-brand',
    ok: 'border-ok/30 bg-ok-soft text-ok',
    warn: 'border-warn/40 bg-warn-soft text-warn',
  }
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs leading-5',
        toneCls[tone],
      )}
    >
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`移除 ${children}`}
          onClick={onRemove}
          className="-mr-0.5 grid size-4 shrink-0 place-items-center rounded text-current/60 transition-colors hover:bg-current/15 hover:text-current"
        >
          <svg viewBox="0 0 12 12" className="size-3">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  )
}

/* ---------------- 空态 ---------------- */
export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: ReactNode
  title: string
  desc: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-20 text-center">
      <div className="grid size-14 place-items-center rounded-xl border border-line bg-canvas-soft text-ink-faint">
        {icon}
      </div>
      <p className="mt-5 text-lg font-semibold text-ink">{title}</p>
      <p className="mt-2 max-w-md text-base leading-relaxed text-ink-faint">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ---------------- 页面标题 ---------------- */
export function PageHead({
  kicker,
  title,
  desc,
  actions,
}: {
  kicker: string
  title: string
  desc?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs tracking-[0.22em] text-ink-faint uppercase">{kicker}</p>
        <h1 className="mt-2 text-[clamp(1.75rem,2vw_+_0.6rem,2.5rem)] font-bold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {desc && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">{desc}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
