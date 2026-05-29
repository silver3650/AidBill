import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 로컬 IP 접속 허용
    port: 5173,
    strictPort: true, // 포트 고정
    hmr: false, // 💡 핵심: 소켓 통신 오류 시 전체 화면 새로고침(Full Reload) 현상 강제 차단
  }
})