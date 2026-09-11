/** 博客文章 */
export interface Post {
  /** 后端自增主键（新增时为 0，由后端生成真实 id） */
  id: number
  title: string
  date: string // yyyy-mm-dd
  category: string
  tags: string[]
  description: string
  content: string // Markdown 正文
  /** 文章状态：DRAFT / PUBLISHED / ARCHIVED（阶段四引入状态机后启用） */
  status?: string
  /** 乐观锁版本号（编辑 / 状态流转时需原样带回） */
  version?: number
  /** 置顶：1 是 / 0 否 */
  isTop?: number
  /** 同组内排序权重，越大越靠前 */
  sort?: number
  /** 内置示例数据标记，展示可删除标识；被编辑或删除后即视为普通数据 */
  isSample?: boolean
  /** 创建时间（后端返回，ISO 字符串） */
  createdAt?: string
  /** 最近更新时间（后端返回，ISO 字符串） */
  updatedAt?: string
}

/** 文章历史版本快照 */
export interface PostRevision {
  version: number
  title: string
  summary: string
  content: string
  createdAt: string
}

/** 项目外链（GitHub / Demo / Docs 等） */
export interface ProjectLink {
  id: string
  label: string
  href: string
}

/** 软件项目 */
export interface Project {
  /** 后端自增主键（新增时为 0，由后端生成真实 id） */
  id: number
  name: string
  tagline: string
  tech: string[]
  links: ProjectLink[]
  /** 内置示例数据标记 */
  isSample?: boolean
  /** 创建时间（后端返回，ISO 字符串） */
  createdAt?: string
  /** 最近更新时间（后端返回，ISO 字符串） */
  updatedAt?: string
}

/** 对外展示站点的视图（展示部分沿用页内切换，不改地址栏） */
export type View = 'home' | 'blog' | 'read' | 'projects' | 'about'

/** 站点基础资料（云端 site_config 单行表，展示站点与后台共用） */
export interface SiteProfile {
  name: string
  en: string
  role: string
  headline: string
  intro: string
  /** 留空表示不展示 */
  github: string
  /** 留空表示不展示 */
  email: string
  tech: string[]
  startYear: number
}

/** 登录用户信息（后端 UserVO） */
export interface AuthUser {
  id: number
  username: string
  nickname: string
  email: string
  roles: string[]
}

/** 登录会话（后端 LoginResponse） */
export interface AuthSession {
  accessToken: string
  refreshToken: string
  /** access token 有效期（秒） */
  expiresIn: number
  user: AuthUser
}
