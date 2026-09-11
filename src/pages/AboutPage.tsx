import { useState } from 'react'
import { Check, Copy, Mail, UserRound } from 'lucide-react'
import { Chip, PageHead } from '../components/ui'
import { GithubIcon } from '../components/icons'
import { useStore } from '../store'
import { useToast } from '../toast'

export function AboutPage() {
  const { site } = useStore()
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  /** 旧浏览器 / 非安全上下文的复制兜底方案 */
  const legacyCopy = (text: string) => {
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.top = '-1000px'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    } catch {
      /* 复制失败时静默忽略 */
    }
  }

  /**
   * 复制邮箱到剪贴板：
   * 优先 Clipboard API，失败 / 不支持时回退 execCommand；
   * 不 await 剪贴板结果，点击后立即给出反馈（避免个别环境权限挂起导致无响应）。
   */
  const copyEmail = () => {
    const text = site.email
    if (!text) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => legacyCopy(text))
    } else {
      legacyCopy(text)
    }
    setCopied(true)
    toast.success('邮箱已复制到剪贴板')
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <PageHead kicker="About · LUOJI" title="关于我" />

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        {/* 自我介绍：通栏 */}
        <section className="rounded-2xl border border-line bg-surface p-7 sm:p-9 lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <UserRound size={18} className="text-brand" />
            <h2 className="text-xl font-bold text-ink">自我介绍</h2>
          </div>
          <div className="max-w-4xl">
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">{site.intro}</p>
            <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-soft">
              本站内容围绕软件工程展开：上方「博客」沉淀技术文章，使用 Markdown 编写并实时渲染；
              「项目」集中展示做过的软件作品，均可点击跳转到 GitHub 等外部地址。
            </p>
          </div>
        </section>

        {/* 技能栈 */}
        <section className="flex flex-col rounded-2xl border border-line bg-surface p-7 sm:p-9">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-ink">技能栈</h2>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {site.tech.map((t) => (
              <Chip key={t} tone="brand">
                {t}
              </Chip>
            ))}
          </div>
        </section>

        {/* 联系我 */}
        <section className="flex flex-col rounded-2xl border border-line bg-surface p-7 sm:p-9">
          <h2 className="text-xl font-bold text-ink">联系我</h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-faint">
            关于技术交流、项目合作或内推机会，欢迎通过以下渠道联系：
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {site.github && (
              <a
                href={site.github}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line-strong px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-brand hover:text-brand"
              >
                <GithubIcon size={17} /> GitHub
              </a>
            )}
            {site.email && (
              <button
                type="button"
                onClick={copyEmail}
                title="点击复制邮箱"
                aria-label={`复制邮箱 ${site.email}`}
                className="focus-ring group inline-flex items-center gap-2 rounded-lg border border-line-strong px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-brand hover:text-brand"
              >
                <Mail size={17} /> {site.email}
                {copied ? (
                  <Check size={15} className="text-ok" aria-hidden="true" />
                ) : (
                  <Copy
                    size={15}
                    aria-hidden="true"
                    className="opacity-0 transition-opacity duration-150 group-hover:opacity-70 group-focus-visible:opacity-70"
                  />
                )}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
