/** 主题工具：与 index.html 的防闪烁初始化脚本共用同一个 localStorage 键（luoji.theme） */

export type Theme = 'light' | 'dark'

/** 读取当前实际生效的主题（由 index.html 预先写到 <html> 上） */
export function getInitialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** 应用并记忆主题 */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem('luoji.theme', theme)
  } catch {
    /* 隐私模式 / 存储不可用时静默忽略 */
  }
}
