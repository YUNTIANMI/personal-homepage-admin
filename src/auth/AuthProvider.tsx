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
  checkSessionValidity,
  cloudEnabled,
  getSession,
  onAuthStateChange,
  signInWithPassword,
  signOut as cloudSignOut,
} from '../lib/cloud'

/**
 * 登录态最长有效期：超过后强制重新登录，无论期间是否活跃。
 * 需要调整期限时改这里即可（目前 7 天）。
 */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/** 已登录时每隔多久向服务端复检一次会话有效性（纯 UX；写入时数据库另有强制校验） */
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000

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

/**
 * 取会话的登录起点：
 * 1. 优先用本地记录（登录时写入，最准确）；
 * 2. 缺失时回退到 Supabase 的 last_sign_in_at（老会话 / 换了浏览器）；
 * 3. 都拿不到则视为「现在」开始，避免误判为过期。
 */
function resolveStartedAt(session: Session): number {
  const stored = readStartedAt()
  if (stored) return stored

  const last = session.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : NaN
  const started = Number.isFinite(last) ? last : Date.now()
  writeStartedAt(started)
  return started
}

function isExpired(startedAt: number): boolean {
  return Date.now() - startedAt > SESSION_MAX_AGE_MS
}

/**
 * 综合判断会话是否已失效：
 * 1. 优先问服务端（权威，依据 auth.sessions.created_at，客户端无法伪造）；
 * 2. 服务端不可用（未部署校验函数 / 网络异常）时，退回本地时间戳判断。
 */
async function isSessionOutdated(session: Session): Promise<boolean> {
  const server = await checkSessionValidity()
  if (server === 'valid') return false
  if (server === 'invalid') return true
  return isExpired(resolveStartedAt(session))
}

interface AuthValue {
  /** 当前会话，未登录为 null */
  session: Session | null
  /** 管理员邮箱（未登录为 null） */
  email: string | null
  /** 会话恢复中（首屏校验登录态） */
  loading: boolean
  /** 是否配置了 Supabase 环境变量 */
  cloudEnabled: boolean
  /** 是否因超过登录有效期被强制登出（登录页据此提示） */
  sessionExpired: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(cloudEnabled)
  const [sessionExpired, setSessionExpired] = useState(false)

  /** 超过有效期则强制登出 */
  const forceExpire = useCallback(async () => {
    try {
      await cloudSignOut()
    } catch (err) {
      console.error('[auth] 会话过期登出失败：', err)
    } finally {
      clearStartedAt()
      setSession(null)
      setSessionExpired(true)
    }
  }, [])

  useEffect(() => {
    if (!cloudEnabled) return

    let cancelled = false

    void (async () => {
      try {
        const current = await getSession()
        if (cancelled || !current) return

        if (await isSessionOutdated(current)) {
          await forceExpire()
          return
        }
        setSession(current)
      } catch (err) {
        console.error('[auth] 读取会话失败：', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    // 登录 / 登出 / token 刷新都会触发，保持全局状态同步并复检有效期
    const unsubscribe = onAuthStateChange((next) => {
      if (next) {
        if (isExpired(resolveStartedAt(next))) {
          void forceExpire()
          return
        }
        setSession(next)
        return
      }
      setSession(null)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [forceExpire])

  // 页面长时间挂着时也要在到期后登出：
  // - 每分钟用本地时间戳快速判断；
  // - 每 5 分钟向服务端复检一次（服务端不可用时自动退回本地判断）。
  useEffect(() => {
    if (!session) return

    const localTimer = setInterval(() => {
      const started = readStartedAt()
      if (started && isExpired(started)) void forceExpire()
    }, 60_000)

    const serverTimer = setInterval(() => {
      void (async () => {
        if (await isSessionOutdated(session)) await forceExpire()
      })()
    }, SESSION_CHECK_INTERVAL_MS)

    return () => {
      clearInterval(localTimer)
      clearInterval(serverTimer)
    }
  }, [session, forceExpire])

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await signInWithPassword(email, password)
    // 记录新的登录起点，并清除「已过期」提示
    writeStartedAt(Date.now())
    setSessionExpired(false)
    setSession(next)
  }, [])

  const signOut = useCallback(async () => {
    await cloudSignOut()
    clearStartedAt()
    setSessionExpired(false)
    setSession(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      email: session?.user?.email ?? null,
      loading,
      cloudEnabled,
      sessionExpired,
      signIn,
      signOut,
    }),
    [session, loading, sessionExpired, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用')
  return ctx
}
