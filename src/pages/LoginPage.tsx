import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { BrandLogo } from '../components/icons'
import { Button, Field, Input, cn } from '../components/ui'

/** 把 Supabase Auth 的报错转成对用户友好的中文提示（不泄露账号是否存在） */
function mapAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  const lower = raw.toLowerCase()
  if (lower.includes('invalid login credentials')) return '邮箱或密码不正确'
  if (lower.includes('email not confirmed'))
    return '该账号邮箱尚未确认，请先在 Supabase 控制台完成邮箱确认'
  if (lower.includes('too many requests') || lower.includes('rate limit'))
    return '尝试过于频繁，请稍后再试'
  if (lower.includes('failed to fetch') || lower.includes('network'))
    return '网络连接失败，请检查网络后重试'
  return `登录失败：${raw}`
}

export function LoginPage() {
  const { signIn, session, loading, cloudEnabled, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 已登录访问登录页 → 直接回后台
  useEffect(() => {
    if (!loading && session) navigate(from, { replace: true })
  }, [loading, session, navigate, from])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return

    setError('')
    if (!email.trim()) {
      setError('请输入邮箱')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }

    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[25rem]">
        {/* 品牌 */}
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size={44} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">后台管理系统</h1>
          <p className="mt-2 font-mono text-xs tracking-[0.28em] text-ink-faint uppercase">
            LUOJI ADMIN
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          {cloudEnabled && sessionExpired && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-[0.9375rem] text-warn"
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">登录有效期已到</p>
                <p className="mt-1 leading-relaxed">
                  为保障账号安全，登录超过 7 天后需要重新验证身份。
                </p>
              </div>
            </div>
          )}

          {!cloudEnabled ? (
            <div className="flex items-start gap-3 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3.5 text-[0.9375rem] text-warn">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">未配置 Supabase</p>
                <p className="mt-1 leading-relaxed">
                  请在项目根目录创建 <code className="font-mono">.env.local</code>，填入
                  <code className="font-mono"> VITE_SUPABASE_URL </code>与
                  <code className="font-mono"> VITE_SUPABASE_ANON_KEY </code>后重新启动开发服务器。
                </p>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} className="space-y-4">
              <Field label="邮箱">
                <div className="relative">
                  <Mail
                    size={15}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
                  />
                  <Input
                    autoFocus
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
              </Field>

              <Field label="密码">
                <div className="relative">
                  <LockKeyhole
                    size={15}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
                  />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="pr-11 pl-9"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    className="focus-ring absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md text-ink-faint transition-colors hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              {error && (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
                >
                  <span className="inline-block size-1.5 shrink-0 rounded-full bg-danger" />
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                className={cn('w-full', submitting && 'pointer-events-none')}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> 登录中…
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
          仅限管理员登录 · 账号由 Supabase 控制台创建
        </p>
      </div>
    </div>
  )
}
