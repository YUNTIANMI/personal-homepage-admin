import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  Images,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { SyncErrorBanner } from '../../components/AdminLayout'
import { ConfirmDialog } from '../../components/Dialog'
import { Button, EmptyState, IconBtn, PageHead } from '../../components/ui'
import { fmtBytes, listAssets, removeAsset, uploadImage, type AssetItem } from '../../lib/storage'
import { useToast } from '../../toast'

/** 媒体库：上传 / 浏览 / 复制链接 / 删除图片（存 Supabase Storage） */
export function AssetsPage() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [pendingDelete, setPendingDelete] = useState<AssetItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await listAssets())
    } catch (err) {
      console.error('[assets] 读取媒体库失败：', err)
      setError('读取媒体库失败：请确认已执行 0005 迁移脚本且登录状态有效')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const list = Array.from(files)
      for (const file of list) await uploadImage(file)
      toast.success(list.length > 1 ? `已上传 ${list.length} 张图片` : '图片已上传')
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '上传失败'
      toast.danger(msg)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const copyUrl = async (item: AssetItem) => {
    try {
      await navigator.clipboard.writeText(item.url)
      setCopied(item.path)
      toast.success('图片链接已复制')
      window.setTimeout(() => setCopied(''), 1800)
    } catch {
      toast.danger('复制失败，请手动选择链接')
    }
  }

  const doDelete = async () => {
    const target = pendingDelete
    if (!target) return
    setPendingDelete(null)
    try {
      await removeAsset(target.path)
      setItems((prev) => prev.filter((i) => i.path !== target.path))
      toast.success('图片已删除')
    } catch (err) {
      console.error('[assets] 删除失败：', err)
      toast.danger('删除失败：请确认登录状态与存储权限')
    }
  }

  return (
    <div>
      <SyncErrorBanner />

      <PageHead
        kicker="ASSETS"
        title="媒体库"
        desc="上传的图片会存到 Supabase Storage，可在文章正文中直接引用；单张不超过 5MB，支持 PNG / JPG / WebP / GIF。"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || busy}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> 刷新
            </Button>
            <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {busy ? '上传中…' : '上传图片'}
            </Button>
          </>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => void onPick(e.target.files)}
      />

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-ink-faint">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">正在读取媒体库…</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4 text-[0.9375rem] text-danger">
            {error}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Images size={22} />}
            title="还没有图片"
            desc="上传第一张图片，然后在文章编辑器里点「插入图片」即可引用。"
            action={
              <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload size={15} /> 上传图片
              </Button>
            }
          />
        ) : (
          <>
            <p className="font-mono text-[13px] text-ink-faint">共 {items.length} 张图片</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {items.map((item) => (
                <figure
                  key={item.path}
                  className="overflow-hidden rounded-xl border border-line bg-surface"
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-16/10 overflow-hidden bg-canvas-soft"
                    title="新标签页打开原图"
                  >
                    <img
                      src={item.url}
                      alt={item.name}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                    />
                  </a>
                  <figcaption className="space-y-2 px-3.5 py-3">
                    <p className="truncate font-mono text-xs text-ink-soft" title={item.path}>
                      {item.path}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-ink-faint">{fmtBytes(item.size)}</span>
                      <div className="flex items-center gap-0.5">
                        <IconBtn label="复制链接" onClick={() => void copyUrl(item)}>
                          {copied === item.path ? <Check size={16} className="text-ok" /> : <Copy size={16} />}
                        </IconBtn>
                        <IconBtn
                          label="打开原图"
                          onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink size={16} />
                        </IconBtn>
                        <IconBtn
                          label="删除"
                          className="hover:bg-danger-soft hover:text-danger"
                          onClick={() => setPendingDelete(item)}
                        >
                          <Trash2 size={16} />
                        </IconBtn>
                      </div>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除图片"
        message={
          pendingDelete
            ? `确定要删除「${pendingDelete.path}」吗？如果它已被文章引用，文章中的图片会失效。`
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void doDelete()}
      />
    </div>
  )
}
