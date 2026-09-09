import { Mail, UserRound } from 'lucide-react'
import { Chip, PageHead } from '../components/ui'
import { GithubIcon } from '../components/icons'
import { SITE } from '../lib/site'

export function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHead kicker="// About · LUOJI" title="关于我" />

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        {/* 自我介绍：通栏 */}
        <section className="rounded-2xl border border-line bg-surface p-7 sm:p-9 lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <UserRound size={18} className="text-brand" />
            <h2 className="text-xl font-bold text-ink">自我介绍</h2>
          </div>
          <div className="max-w-4xl">
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">{SITE.intro}</p>
            <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-soft">
              本站内容围绕软件工程展开：上方「博客」沉淀技术文章，使用 Markdown 编写并实时渲染；
              「项目」集中展示做过的软件作品，均可点击跳转到 GitHub 等外部地址。
            </p>
          </div>
        </section>

        {/* 技能栈 */}
        <section className="flex flex-col rounded-2xl border border-line bg-surface p-7 sm:p-9">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm text-brand">$</span>
            <h2 className="text-xl font-bold text-ink">技能栈</h2>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {SITE.tech.map((t) => (
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
            {SITE.github && (
              <a
                href={SITE.github}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line-strong px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-brand hover:text-brand"
              >
                <GithubIcon size={17} /> GitHub
              </a>
            )}
            {SITE.email && (
              <a
                href={`mailto:${SITE.email}`}
                className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line-strong px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-brand hover:text-brand"
              >
                <Mail size={17} /> {SITE.email}
              </a>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
