/** 博客文章 */
export interface Post {
  id: string
  title: string
  date: string // yyyy-mm-dd
  category: string
  tags: string[]
  description: string
  content: string // Markdown 正文
  /** 内置示例数据标记，展示可删除标识；被编辑或删除后即视为普通数据 */
  isSample?: boolean
}

/** 项目外链（GitHub / Demo / Docs 等） */
export interface ProjectLink {
  id: string
  label: string
  href: string
}

/** 软件项目 */
export interface Project {
  id: string
  name: string
  tagline: string
  tech: string[]
  links: ProjectLink[]
  /** 内置示例数据标记 */
  isSample?: boolean
}

export type View = 'home' | 'blog' | 'read' | 'projects' | 'about'
