import { useRef, useState } from 'react'
import {
  AlertTriangle,
  Download,
  FileJson,
  KeyRound,
  Loader2,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { SyncErrorBanner } from '../../components/AdminLayout'
import { Button, Field, Input, PageHead } from '../../components/ui'
import { useAuth } from '../../auth/AuthProvider'
import { apiChangePassword, createPost, createProject, saveSiteConfig } from '../../lib/api'
import { mergeSite } from '../../lib/site'
import { useStore } from '../../store'
import { useToast } from '../../toast'
import type { Post, Project, SiteProfile } from '../../types'

interface ImportPayload {
  version?: number
  exportedAt?: string
  posts?: Post[]
  projects?: Project[]
  siteProfile?: SiteProfile | null
}

interface Diff {
  postsAdd: number
  postsUpdate: number
  projectsAdd: number
  projectsUpdate: number
  hasSite: boolean
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** 解析并校验导入文件；不合法时抛出可读原因 */
function parsePayload(text: string): ImportPayload {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('不是合法的 JSON 文件')
  }
  if (!isObject(data)) throw new Error('文件结构不正确：顶层应为对象')

  const { posts, projects } = data as ImportPayload
  if (posts !== undefined && !Array.isArray(posts)) throw new Error('posts 字段必须是数组')
  if (projects !== undefined && !Array.isArray(projects)) throw new Error('projects 字段必须是数组')
  if (
    Array.isArray(posts) &&
    !posts.every((p) => isObject(p) && (typeof p.id === 'number' || typeof p.id === 'string') && typeof p.title === 'string')
  ) {
    throw new Error('存在缺少 id / title 的文章记录')
  }
  if (
    Array.isArray(projects) &&
    !projects.every((j) => isObject(j) && (typeof j.id === 'number' || typeof j.id === 'string') && typeof j.name === 'string')
  ) {
    throw new Error('存在缺少 id / name 的项目记录')
  }
  return data as ImportPayload
}

/** 数据导入导出 + 管理员密码修改 */
export function SettingsPage() {
  const { posts, projects, site, reload } = useStore()
  const { username } = useAuth()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [filename, setFilename] = useState('')
  const [payload, setPayload] = useState<ImportPayload | null>(null)
  const [diff, setDiff] = useState<Diff | null>(null)
  const [importing, setImporting] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  /* ---------------- 导出 ---------------- */

  const exportJson = () => {
    const data: ImportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      posts,
      projects,
      siteProfile: site,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `luoji-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`已导出 ${posts.length} 篇文章 / ${projects.length} 个项目`)
  }

  /* ---------------- 导入 ---------------- */

  const onPickFile = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setFilename(file.name)
    setPayload(null)
    setDiff(null)
    try {
      const text = await file.text()
      const parsed = parsePayload(text)

      const currentPostIds = new Set(posts.map((p) => p.id))
      const currentProjectIds = new Set(projects.map((j) => j.id))
      const nextPosts = parsed.posts ?? []
      const nextProjects = parsed.projects ?? []

      setDiff({
        postsAdd: nextPosts.filter((p) => !currentPostIds.has(p.id)).length,
        postsUpdate: nextPosts.filter((p) => currentPostIds.has(p.id)).length,
        projectsAdd: nextProjects.filter((j) => !currentProjectIds.has(j.id)).length,
        projectsUpdate: nextProjects.filter((j) => currentProjectIds.has(j.id)).length,
        hasSite: !!parsed.siteProfile,
      })
      setPayload(parsed)
      toast.info('文件已解析，请核对下方差异后再确认导入')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '文件解析失败'
      setFilename('')
      toast.danger(msg)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const applyImport = async () => {
    if (!payload || importing) return
    setImporting(true)
    try {
      // 阶段三后端尚未提供 /api/import 事务接口，暂时前端逐条新增；
      // 阶段五后端实现导入导出后，这里改为一次性调用 /api/import（差异预览 + 事务写入）。
      if (payload.posts?.length) {
        for (const p of payload.posts) await createPost({ ...p, id: 0 })
      }
      if (payload.projects?.length) {
        for (const p of payload.projects) await createProject({ ...p, id: 0 })
      }
      if (payload.siteProfile) await saveSiteConfig(mergeSite(payload.siteProfile))
      await reload()
      toast.success('导入完成，数据已更新')
      setPayload(null)
      setDiff(null)
      setFilename('')
    } catch (err) {
      console.error('[import] 导入失败：', err)
      toast.danger('导入失败：请确认登录状态与数据库权限')
    } finally {
      setImporting(false)
    }
  }

  /* ---------------- 修改密码 ---------------- */

  const changePassword = async () => {
    setPwError('')
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('请填写完整的当前密码与新密码')
      return
    }
    if (newPw.length < 6) {
      setPwError('新密码至少 6 位')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('两次输入的新密码不一致')
      return
    }

    setPwSaving(true)
    try {
      // 后端会校验旧密码；成功后吊销该用户全部 token（其他设备会话失效）
      await apiChangePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      toast.success('密码已更新，其他设备上的会话已失效')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '修改密码失败'
      setPwError(msg)
      toast.danger(msg)
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div>
      <SyncErrorBanner />

      <PageHead
        kicker="SETTINGS"
        title="设置"
        desc="数据备份与恢复、管理员密码管理。导入只会新增或更新，不会删除现有内容。"
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {/* 导出 */}
        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Download size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">导出数据</h2>
              <p className="mt-0.5 text-[13px] text-ink-faint">
                当前：{posts.length} 篇文章 · {projects.length} 个项目 · 站点配置
              </p>
            </div>
          </div>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
            导出为 JSON 文件（包含文章、项目与站点配置），可用于备份或迁移。
          </p>
          <div className="mt-5">
            <Button variant="primary" size="sm" onClick={exportJson}>
              <Download size={15} /> 导出 JSON
            </Button>
          </div>
        </section>

        {/* 导入 */}
        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-warn-soft text-warn">
              <Upload size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">导入数据</h2>
              <p className="mt-0.5 text-[13px] text-ink-faint">先导出备份，再导入更安全</p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-warn">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              导入会按 <code className="font-mono">id</code> 覆盖同 id 的内容，
              <strong>不会删除</strong>文件中未出现的现有内容。
            </span>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files)}
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
              <FileJson size={15} /> 选择 JSON 文件
            </Button>
            {filename && <span className="font-mono text-xs text-ink-faint">{filename}</span>}
          </div>

          {diff && (
            <div className="mt-4 rounded-lg border border-line bg-canvas-soft px-4 py-3.5 text-[0.9375rem]">
              <p className="font-medium text-ink">差异预览</p>
              <ul className="mt-2 space-y-1 text-ink-soft">
                <li>
                  文章：新增 <span className="font-mono text-brand">{diff.postsAdd}</span> 篇 · 覆盖{' '}
                  <span className="font-mono text-brand">{diff.postsUpdate}</span> 篇
                </li>
                <li>
                  项目：新增 <span className="font-mono text-brand">{diff.projectsAdd}</span> 个 · 覆盖{' '}
                  <span className="font-mono text-brand">{diff.projectsUpdate}</span> 个
                </li>
                <li>站点配置：{diff.hasSite ? '包含，将覆盖' : '未包含，保持现状'}</li>
              </ul>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPayload(null)
                    setDiff(null)
                    setFilename('')
                  }}
                  disabled={importing}
                >
                  取消
                </Button>
                <Button variant="primary" size="sm" onClick={() => void applyImport()} disabled={importing}>
                  {importing ? <Loader2 size={15} className="animate-spin" /> : null}
                  {importing ? '导入中…' : '确认导入'}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* 修改密码 */}
        <section className="rounded-2xl border border-line bg-surface p-6 xl:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-ok-soft text-ok">
              <KeyRound size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">修改密码</h2>
              <p className="mt-0.5 text-[13px] text-ink-faint">当前账号：{username ?? '—'}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field label="当前密码">
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="用于校验身份"
              />
            </Field>
            <Field label="新密码" hint="至少 6 位">
              <Input
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="请输入新密码"
              />
            </Field>
            <Field label="确认新密码">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="再次输入新密码"
              />
            </Field>
          </div>

          {pwError && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-[0.9375rem] text-danger">
              <span className="inline-block size-1.5 rounded-full bg-danger" />
              {pwError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" onClick={() => void changePassword()} disabled={pwSaving}>
              {pwSaving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {pwSaving ? '提交中…' : '更新密码'}
            </Button>
            <span className="text-[13px] text-ink-faint">
              修改成功后，其他设备上的登录会话会失效，需要重新登录。
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
