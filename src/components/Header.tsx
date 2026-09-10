import { Moon, Sun } from 'lucide-react'
import type { View } from '../types'
import { SITE } from '../lib/site'
import { useStore } from '../store'
import { BrandLogo } from './icons'
import { cn } from './ui'

const NAV: Array<{ key: View; label: string }> = [
  { key: 'home', label: '首页' },
  { key: 'blog', label: '博客' },
  { key: 'projects', label: '项目' },
  { key: 'about', label: '关于' },
]

export function Header({
  view,
  onNavigate,
  theme,
  onToggleTheme,
}: {
  view: View
  onNavigate: (v: View) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
      {/* 与主内容对齐的流体内层，无宽度锁 */}
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex h-16 items-center justify-between gap-3 py-2.5">
          {/* 品牌 */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            aria-label="回到首页"
            className="focus-ring flex items-center gap-2.5"
          >
            <BrandLogo size={32} />
            <span className="flex flex-col items-start leading-none">
              <span className="text-base font-bold tracking-tight text-ink">{SITE.name}</span>
              <span className="mt-1 font-mono text-xs tracking-[0.3em] text-ink-faint">
                {SITE.en}
              </span>
            </span>
          </button>

          {/* 桌面端导航 */}
          <nav aria-label="主导航" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = view === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'focus-ring relative rounded-md px-4 py-2 text-base transition-colors duration-150',
                    active
                      ? 'bg-brand-soft font-semibold text-brand'
                      : 'text-ink-soft hover:bg-canvas-soft hover:text-ink',
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* 操作区：仅保留明 / 暗主题切换 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}
              aria-label={theme === 'dark' ? '切换为浅色主题' : '切换为深色主题'}
              className="focus-ring grid size-10 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-canvas-soft hover:text-ink"
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </div>

        {/* 移动端导航 */}
        <nav
          aria-label="主导航（移动端）"
          className="-mb-px flex gap-1 overflow-x-auto md:hidden"
        >
          {NAV.map((item) => {
            const active = view === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                                'focus-ring relative shrink-0 rounded-t-lg px-4 py-2.5 text-base transition-colors',
                                active
                                  ? 'border-b-2 border-brand font-semibold text-brand'
                                  : 'text-ink-soft hover:text-ink',
                              )}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  const { cloudEnabled, syncStatus } = useStore()

  // 数据存储状态提示（便于确认数据到底存在哪）
  const storageLabel = !cloudEnabled
    ? '本地存储 · 数据仅保存在当前浏览器'
    : syncStatus === 'loading'
      ? '云端同步中…'
      : syncStatus === 'error'
        ? '云端同步失败 · 已回退本地缓存'
        : '云端同步正常'

  return (
    <footer className="mt-16 border-t border-line/80">
      <div className="flex w-full flex-col items-center justify-between gap-2 px-4 py-7 text-sm text-ink-faint sm:flex-row sm:px-6 lg:px-8 xl:px-10">
        <p>
          © {SITE.startYear} {SITE.name} · {SITE.role}
        </p>
        <p className="flex items-center gap-2 font-mono">
          {cloudEnabled && (
            <span
              aria-hidden="true"
              className={cn(
                'inline-block size-1.5 shrink-0 rounded-full',
                syncStatus === 'error' ? 'bg-danger' : 'bg-ok',
              )}
            />
          )}
          {storageLabel}
        </p>
      </div>
    </footer>
  )
}
