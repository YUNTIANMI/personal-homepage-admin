import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Loader2, RotateCcw } from 'lucide-react'
import { Button, EmptyState, PageHead } from '../../components/ui'
import { fetchTrashPosts, restorePost } from '../../lib/api'
import { useStore } from '../../store'
import { useToast } from '../../toast'
import type { Post } from '../../types'

/** 回收站：列出已逻辑删除的文章，支持恢复 */
export function TrashPage() {
  const { reload } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setPosts(await fetchTrashPosts())
    } catch (err) {
      console.error('[trash] 读取回收站失败：', err)
      toast.danger(err instanceof Error ? err.message : '读取回收站失败')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const doRestore = async (id: number) => {
    try {
      await restorePost(id)
      await reload()
      await load()
      toast.success('已恢复文章')
    } catch (err) {
      console.error('[trash] 恢复失败：', err)
      toast.danger(err instanceof Error ? err.message : '恢复失败')
    }
  }

  return (
    <div>
      <PageHead
        kicker="TRASH"
        title="回收站"
        desc="已删除的文章暂存于此（逻辑删除），可随时恢复。"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/posts')}>
            <ArrowLeft size={15} /> 返回文章管理
          </Button>
        }
      />

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-ink-faint">
            <Loader2 size={18} className="animate-spin" /> 正在读取回收站…
          </div>
        ) : posts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<FileText size={22} />}
              title="回收站是空的"
              desc="删除的文章会先进入回收站，可在这里恢复。"
              action={
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/posts')}>
                  <ArrowLeft size={15} /> 返回文章管理
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {posts.map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{post.title || '（无标题）'}</p>
                  <p className="mt-1 font-mono text-xs text-ink-faint">
                    删除时间 {post.updatedAt ?? '—'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void doRestore(post.id)}>
                  <RotateCcw size={15} /> 恢复
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
