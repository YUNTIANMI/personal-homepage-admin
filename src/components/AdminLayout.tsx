import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Cloud,
  CloudOff,
  FileText,
  FolderKanban,
  Images,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useStore } from '../store'
import { applyTheme, getInitialTheme, type Theme } from '../theme'
import { useToast } from '../toast'
import { ConfirmDialog } from './Dialog'
import { BrandLogo } from './icons'
import { cn } from './ui'

const NAV: Array<{ to: string; label: string; icon: typeof FileText; end?: boolean }> = [
  { to: '/admin', label: '仪表盘', icon: LayoutDashboard, end: true },
  { to: '/admin/posts', label: '文章管理', icon: FileText },
  { to: '/admin/projects', label: '项目管理', icon: FolderKanban },
  { to: '/admin/assets', label: '媒体库', icon: Images },
  { to: '/admin/profile', label: '站点配置', icon: UserRound },
  { to: '/admin/settings', label: '设置', icon: Settings },
]

/** 顶栏云端同步状态徽标 */
function SyncBadge() {
  const { cloudEnabled, syncStatus } = useStore()

  const { label, cls, icon } = !cloudEnabled
    ? { label: '本地模式', cls: 'text-ink-faint', icon: <CloudOff size={15} /> }
    : syncStatus === 'loading'
      ? { label: '同步中…', cls: 'text-ink-faint', icon: <Loader2 size={15} className="animate-spin" /> }
      : syncStatus === 'error'
        ? { label: '同步失败', cls: 'text-danger', icon: <CloudOff size={15} /> }
        : { label: '云端已同步', cls: 'text-ok', icon: <Cloud size={15} /> }

  return (
    <span
      className={cn('hidden items-center gap-1.5 font-mono text-xs sm:inline-flex', cls)}
      title={label}
    >
      {icon}
      {label}
    </span>
  )
}

export function AdminLayout() {
  const { username, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }

  const doLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      toast.info('已退出登录')
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('[auth] 退出登录失败：', err)
      toast.danger('退出登录失败，请重试')
    } finally {
      setLoggingOut(false)
      setConfirmLogout(false)
    }
  }

  const navContent = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-5">
        <BrandLogo size={30} />
        <span className="flex flex-col leading-none">
          <span className="text-[0.9375rem] font-bold tracking-tight text-ink">后台管理</span>
          <span className="mt-1 font-mono text-[0.6875rem] tracking-[0.26em] text-ink-faint">
            LUOJI ADMIN
          </span>
        </span>
      </div>

      <nav aria-label="后台导航" className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                cn(
                  'focus-ring flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[0.9375rem] font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-brand-soft text-brand'
                    : 'text-ink-soft hover:bg-canvas-soft hover:text-ink',
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-line px-5 py-4">
        <p className="font-mono text-[0.6875rem] text-ink-faint">v0.2.0</p>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* 桌面端固定侧边栏 */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        {navContent}
      </aside>

      {/* 移动端抽屉 */}
      {drawerOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-[#0a0f16]/45 backdrop-blur-[2px]"
            onMouseDown={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-surface shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}

      {/* 右侧主区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8 xl:px-10">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="打开导航菜单"
              className="focus-ring grid size-9 shrink-0 place-items-center rounded-md text-ink-soft transition-colors hover:bg-canvas-soft hover:text-ink lg:hidden"
            >
              <Menu size={19} />
            </button>

            <div className="min-w-0 flex-1" />

            <SyncBadge />

            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}
              aria-label={theme === 'dark' ? '切换为浅色主题' : '切换为深色主题'}
              className="focus-ring grid size-9 shrink-0 place-items-center rounded-md text-ink-soft transition-colors hover:bg-canvas-soft hover:text-ink"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <span
              className="hidden max-w-56 truncate text-sm text-ink-soft md:inline"
              title={username ?? ''}
            >
              {username ?? '未登录'}
            </span>

            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              title="退出登录"
              aria-label="退出登录"
              className="focus-ring grid size-9 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main
          key={location.pathname}
          className="fade-up w-full min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10"
        >
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="退出登录"
        message="确定要退出当前管理员账号吗？退出后需要重新登录才能管理内容。"
        confirmText={loggingOut ? '退出中…' : '退出登录'}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={doLogout}
      />
    </div>
  )
}

/** 供页面复用的「同步失败 / 重试」提示条 */
export function SyncErrorBanner() {
  const { syncStatus, cloudEnabled, reload } = useStore()
  const toast = useToast()
  const [retrying, setRetrying] = useState(false)

  if (!cloudEnabled || syncStatus !== 'error') return null

  const retry = async () => {
    setRetrying(true)
    try {
      await reload()
      toast.success('已重新同步云端数据')
    } catch {
      toast.danger('仍然无法连接云端，请稍后重试')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[0.9375rem] text-danger">
      <span className="flex items-center gap-2">
        <CloudOff size={17} className="shrink-0" />
        云端同步失败，当前展示的可能是本地缓存数据。
      </span>
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-danger/40 px-3 text-sm font-medium transition-colors hover:bg-danger/10 disabled:opacity-50"
      >
        <RefreshCw size={14} className={cn(retrying && 'animate-spin')} />
        重试
      </button>
    </div>
  )
}
