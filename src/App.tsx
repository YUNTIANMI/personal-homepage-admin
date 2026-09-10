import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminLayout } from './components/AdminLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { PostListPage } from './pages/admin/PostListPage'
import { ProjectListPage } from './pages/admin/ProjectListPage'

/**
 * 后台管理系统路由：
 * - /login         登录页（已登录会自动跳回后台）
 * - /admin/*       受保护区域，统一套用「侧边栏 + 顶栏 + 内容区」布局
 * - 其他路径        重定向到 /admin（再由守卫决定是否去登录页）
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

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
