import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    // 与前台项目（luoji-home，5173）区分：两个项目可同时启动且互不抢端口
    port: 5174,
  },
})
