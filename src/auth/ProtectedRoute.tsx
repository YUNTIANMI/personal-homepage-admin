import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './AuthProvider'

/**
 * 路由守卫：
 * - 会话校验中 → 全屏加载（避免受保护内容闪现）
 * - 未登录 → 重定向到 /login，并记录来源路径，登录后跳回
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <span className="flex items-center gap-2 text-ink-faint">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm">正在校验登录状态…</span>
        </span>
      </div>
    )
  }

  if (!session) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    )
  }

  return <Outlet />
}
