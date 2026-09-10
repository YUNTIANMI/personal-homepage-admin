import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  cloudEnabled,
  getSession,
  onAuthStateChange,
  signInWithPassword,
  signOut as cloudSignOut,
} from '../lib/cloud'

interface AuthValue {
  /** 当前会话，未登录为 null */
  session: Session | null
  /** 管理员邮箱（未登录为 null） */
  email: string | null
  /** 会话恢复中（首屏校验登录态） */
  loading: boolean
  /** 是否配置了 Supabase 环境变量 */
  cloudEnabled: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(cloudEnabled)

  useEffect(() => {
    if (!cloudEnabled) return

    let cancelled = false

    void (async () => {
      try {
        const current = await getSession()
        if (!cancelled) setSession(current)
      } catch (err) {
        console.error('[auth] 读取会话失败：', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    // 登录 / 登出 / token 刷新都会触发，保持全局状态同步
    const unsubscribe = onAuthStateChange((next) => setSession(next))

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await signInWithPassword(email, password)
    setSession(next)
  }, [])

  const signOut = useCallback(async () => {
    await cloudSignOut()
    setSession(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      email: session?.user?.email ?? null,
      loading,
      cloudEnabled,
      signIn,
      signOut,
    }),
    [session, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用')
  return ctx
}
