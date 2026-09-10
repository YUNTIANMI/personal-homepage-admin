import { ExternalLink, FolderGit2 } from 'lucide-react'
import { Chip, EmptyState, PageHead } from '../components/ui'
import { useStore } from '../store'

/** 项目展示（展示站点）：只读卡片 + 外链跳转；内容统一在后台 /admin 发布 */
export function ProjectsPage() {
  const { projects } = useStore()

  return (
    <div className="space-y-6">
      <PageHead kicker="Projects · Open Source" title="软件项目" />

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="mr-auto font-mono text-[13px] text-ink-faint">
          共 {projects.length} 个项目
        </span>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 size={22} />}
          title="暂无项目"
          desc="这里会展示作者发布的软件项目，请稍后再来看看。"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {projects.map((project) => (
            <article
              key={project.id}
              className="flex flex-col rounded-xl border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong"
            >
              <div className="flex items-center gap-2.5">
                <h3 className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold text-ink">
                  {project.name}
                </h3>
              </div>

              <p className="mt-3 line-clamp-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                {project.tagline}
              </p>

              {project.tech.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.tech.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
              )}

              {project.links.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                  {project.links.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${link.label} · ${link.href}`}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas-soft px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-colors duration-150 hover:border-brand hover:bg-brand-soft hover:text-brand"
                    >
                      {link.label || '链接'}
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
