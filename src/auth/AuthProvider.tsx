import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiLogin,
  apiLogout,
  apiMe,
  clearTokens,
  cloudEnabled,
  getAccessToken,
  type ApiError,
} from '../lib/api'
import type { AuthUser } from '../types'

/**
 * 登录态最长有效期：超过后强制重新登录，无论期间是否活跃。
 * 与后端 refresh token 的 7 天有效期保持一致（目前 7 天）。
 */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/** 记录本次登录的起始时间（毫秒时间戳），用于判定是否超过有效期 */
const SESSION_STARTED_KEY = 'luoji.admin.session.startedAt'

function readStartedAt(): number | null {
  try {
    const raw = localStorage.getItem(SESSION_STARTED_KEY)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function writeStartedAt(ts: number): void {
  try {
    localStorage.setItem(SESSION_STARTED_KEY, String(ts))
  } catch {
    /* 存储不可用时静默忽略 */
  }
}

function clearStartedAt(): void {
  try {
    localStorage.removeItem(SESSION_STARTED_KEY)
  } catch {
    /* ignore */
  }
}

interface AuthValue {
  /** 当前登录用户，未登录为 null */
  user: AuthUser | null
  /** 登录用户名（未登录为 null） */
  username: string | null
  /** 会话恢复中（首屏校验登录态） */
  loading: boolean
  /** 是否启用了后端 API */
  cloudEnabled: boolean
  /** 是否因超过登录有效期被强制登出（登录页据此提示） */
  sessionExpired: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  /** 清除本地登录态并标记「已过期」 */
  const forceExpire = useCallback(() => {
    clearTokens()
    clearStartedAt()
    setUser(null)
    setSessionExpired(true)
  }, [])

  // 首屏：用本地 access token 恢复会话（token 已失效则静默清除）
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (!getAccessToken()) return

        const started = readStartedAt()
        if (started && Date.now() - started > SESSION_MAX_AGE_MS) {
          if (!cancelled) forceExpire()
          return
        }

        const me = await apiMe()
        if (cancelled) return
        setUser(me)
      } catch (err) {
        // 401 说明 refresh 也失效 → 会话确实过期；网络错误则保持静默
        const status = (err as ApiError).status
        if (status === 401) {
          if (!cancelled) forceExpire()
        } else {
          console.error('[auth] 读取当前用户失败：', err)
          clearTokens()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [forceExpire])

  // 页面长时间挂着时，每分钟用本地时间戳检查是否超过最长有效期
  useEffect(() => {
    if (!user) return
    const timer = setInterval(() => {
      const started = readStartedAt()
      if (started && Date.now() - started > SESSION_MAX_AGE_MS) forceExpire()
    }, 60_000)
    return () => clearInterval(timer)
  }, [user, forceExpire])

  const signIn = useCallback(async (username: string, password: string) => {
    const result = await apiLogin(username, password)
    writeStartedAt(Date.now())
    setSessionExpired(false)
    setUser(result.user)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await apiLogout()
    } catch (err) {
      // 登出接口失败也照常清除本地登录态（token 已失效时后端会返回 401）
      console.error('[auth] 登出失败：', err)
    }
    clearStartedAt()
    setSessionExpired(false)
    setUser(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      username: user?.username ?? null,
      loading,
      cloudEnabled,
      sessionExpired,
      signIn,
      signOut,
    }),
    [user, loading, sessionExpired, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用')
  return ctx
}
