import type { SiteProfile } from '../types'

/**
 * 站点基础资料的**本地默认值**。
 *
 * 线上以云端 `site_profile` 表为准（后台可编辑）；
 * 云端未配置、表不存在或字段为空时回退到这里，保证页面不会空白。
 */
export const SITE: SiteProfile = {
  name: '罗辑',
  en: 'LUOJI',
  role: 'Software Engineer · 软件工程',
  headline: '写代码，也写文章。',
  intro:
    '软件工程专业，长期关注 Web 全栈开发与工程化实践。这里是我记录技术思考、沉淀文章与展示软件项目的独立主页。',
  github: 'https://github.com/YUNTIANMI/', // TODO: 替换为真实 GitHub 主页地址
  email: '1431634649@qq.com', // 留空则不在页面展示
  tech: ['TypeScript', 'React', 'Node.js', 'Python', 'Git', 'Tailwind CSS', '数据结构与算法'],
  startYear: 2026,
}

/**
 * 把云端配置与本地默认值合并：
 * - 字段缺失 / 空白 → 回退默认值（避免页面出现空标题、空简介）；
 * - `github` / `email` 例外：按原样采用，留空即表示「不展示」。
 */
export function mergeSite(raw?: Partial<SiteProfile> | null): SiteProfile {
  if (!raw) return SITE

  const text = (v: unknown, fallback: string) =>
    typeof v === 'string' && v.trim() ? v.trim() : fallback

  return {
    name: text(raw.name, SITE.name),
    en: text(raw.en, SITE.en),
    role: text(raw.role, SITE.role),
    headline: text(raw.headline, SITE.headline),
    intro: text(raw.intro, SITE.intro),
    github: typeof raw.github === 'string' ? raw.github.trim() : SITE.github,
    email: typeof raw.email === 'string' ? raw.email.trim() : SITE.email,
    tech: Array.isArray(raw.tech)
      ? raw.tech.filter((t): t is string => typeof t === 'string')
      : SITE.tech,
    startYear:
      typeof raw.startYear === 'number' && Number.isFinite(raw.startYear)
        ? raw.startYear
        : SITE.startYear,
  }
}
