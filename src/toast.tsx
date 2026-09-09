import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Check, Info, X } from 'lucide-react'

interface ToastItem {
  id: string
  message: string
  tone: 'success' | 'danger' | 'info'
}

interface ToastApi {
  success: (msg: string) => void
  danger: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const push = useCallback(
    (message: string, tone: ToastItem['tone']) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setItems((prev) => [...prev.slice(-4), { id, message, tone }])
      timers.current[id] = setTimeout(() => dismiss(id), 2800)
    },
    [dismiss],
  )

  const api = useRef<ToastApi>({
    success: (m: string) => push(m, 'success'),
    danger: (m: string) => push(m, 'danger'),
    info: (m: string) => push(m, 'info'),
  }).current

  const toneIcon = {
    success: <Check size={14} strokeWidth={3} />,
    danger: <X size={14} strokeWidth={3} />,
    info: <Info size={14} />,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast 挂载层 */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-3 text-[15px] shadow-lg backdrop-blur transition-all duration-200 animate-[toast-in_.18s_ease-out] ${
              t.tone === 'success'
                ? 'border-ok/30 bg-ok-soft/95 text-ok'
                : t.tone === 'danger'
                  ? 'border-danger/30 bg-danger-soft/95 text-danger'
                  : 'border-line bg-surface/95 text-ink'
            }`}
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
                t.tone === 'success'
                  ? 'bg-ok text-white'
                  : t.tone === 'danger'
                    ? 'bg-danger text-white'
                    : 'bg-brand text-white'
              }`}
            >
              {toneIcon[t.tone]}
            </span>
            <span className="flex-1 text-ink">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="关闭提示"
              className="text-ink-faint transition-colors hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必须在 <ToastProvider> 内使用')
  return ctx
}
