import { useCallback, useEffect, useState } from 'react'
import type { View } from '../types'
import { useStore } from '../store'
import { applyTheme, getInitialTheme, type Theme } from '../theme'
import { Footer, Header } from '../components/Header'
import { AboutPage } from './AboutPage'
import { BlogPage } from './BlogPage'
import { HomePage } from './HomePage'
import { PostReader } from './PostReader'
import { ProjectsPage } from './ProjectsPage'

/**
 * 对外展示站点（只读）
 *
 * - 访客无需登录即可浏览，页面不提供任何新增 / 编辑 / 删除入口；
 * - 内容全部由后台（/admin，登录后）发布，两边共用同一份云端数据；
 * - 展示部分沿用「页内切换」：点导航不改地址栏，因此刷新会回到首页。
 */
export function PublicSite() {
  const { posts } = useStore()
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [view, setViewRaw] = useState<View>('home')
  const [readId, setReadId] = useState<string | null>(null)

  const setView = useCallback((v: View) => {
    setViewRaw(v)
    setReadId(null)
    window.scrollTo({ top: 0 })
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [])

  // 正在阅读的文章可能已被后台删除，回到列表
  useEffect(() => {
    if (view === 'read' && readId && !posts.some((p) => p.id === readId)) {
      setView('blog')
    }
  }, [view, readId, posts, setView])

  const readingPost = view === 'read' && readId ? posts.find((p) => p.id === readId) ?? null : null

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Header view={view} onNavigate={setView} theme={theme} onToggleTheme={toggleTheme} />

      {/* 页面级流体容器：随视口宽度铺满，由内层内容级容器按需限制行宽 */}
      <main key={view} className="fade-up w-full flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-10 lg:px-8 xl:px-10">
        {view === 'home' && <HomePage onNavigate={setView} />}
        {view === 'blog' && (
          <BlogPage
            onRead={(p) => {
              setReadId(p.id)
              setViewRaw('read')
              window.scrollTo({ top: 0 })
            }}
          />
        )}
        {view === 'read' &&
          (readingPost ? <PostReader post={readingPost} onBack={() => setView('blog')} /> : null)}
        {view === 'projects' && <ProjectsPage />}
        {view === 'about' && <AboutPage />}
      </main>

      <Footer />
    </div>
  )
}
