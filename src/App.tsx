import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminLayout } from './components/AdminLayout'
import { LoginPage } from './pages/LoginPage'
import { PublicSite } from './pages/PublicSite'
import { DashboardPage } from './pages/admin/DashboardPage'
import { PostListPage } from './pages/admin/PostListPage'
import { ProjectListPage } from './pages/admin/ProjectListPage'

/**
 * 一个应用，两个区域：
 *
 *   对外展示（只读，任何人可访问，页内切换、不改地址栏）
 *      /  → PublicSite（首页 / 博客 / 项目 / 关于）
 *
 *   管理后台（需登录）
 *      /login             登录页
 *      /admin             仪表盘
 *      /admin/posts       文章管理
 *      /admin/projects    项目管理
 *
 * 其余任意路径都会落到展示站点，保证对外访问不会有 404。
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="posts" element={<PostListPage />} />
          <Route path="projects" element={<ProjectListPage />} />
        </Route>
      </Route>

      <Route path="*" element={<PublicSite />} />
    </Routes>
  )
}
