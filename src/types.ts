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
  /** 云端创建时间（阶段一新增列，旧数据可能缺失，故可选） */
  created_at?: string
  /** 云端最近更新时间（阶段一新增列，由数据库触发器维护） */
  updated_at?: string
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
  /** 云端创建时间（阶段一新增列，旧数据可能缺失，故可选） */
  created_at?: string
  /** 云端最近更新时间（阶段一新增列，由数据库触发器维护） */
  updated_at?: string
}

/** 对外展示站点的视图（展示部分沿用页内切换，不改地址栏） */
export type View = 'home' | 'blog' | 'read' | 'projects' | 'about'
