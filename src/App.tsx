import { useCallback, useEffect, useState } from 'react'
import type { Post, View } from './types'
import { useStore } from './store'
import { Footer, Header } from './components/Header'
import { HomePage } from './pages/HomePage'
import { BlogPage } from './pages/BlogPage'
import { PostReader } from './pages/PostReader'
import { ProjectsPage } from './pages/ProjectsPage'
import { AboutPage } from './pages/AboutPage'
import { PostFormDialog } from './pages/PostFormDialog'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export default function App() {
  const { posts } = useStore()
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [view, setViewRaw] = useState<View>('home')
  const [readId, setReadId] = useState<string | null>(null)
  /** undefined=编辑器关闭；post 为 null 表示新增 */
  const [editor, setEditor] = useState<{ post: Post | null } | undefined>(undefined)

  const setView = useCallback((v: View) => {
    setViewRaw(v)
    setReadId(null)
    window.scrollTo({ top: 0 })
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      try {
        localStorage.setItem('luoji.theme', next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  // 阅读的文章可能已被删除，回到列表
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
            onOpenEditor={(post) => setEditor({ post })}
          />
        )}
        {view === 'read' &&
          (readingPost ? (
            <PostReader
              post={readingPost}
              onBack={() => setView('blog')}
              onEdit={(p) => setEditor({ post: p })}
            />
          ) : null)}
        {view === 'projects' && <ProjectsPage />}
        {view === 'about' && <AboutPage />}
      </main>

      {/* 新增 / 编辑文章对话框（全局提供，列表与阅读页共用） */}
      {editor !== undefined && (
        <PostFormDialog open post={editor.post} onClose={() => setEditor(undefined)} />
      )}

      <Footer />
    </div>
  )
}
