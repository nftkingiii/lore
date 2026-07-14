import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/supermemory': {
        target: 'http://127.0.0.1:6767',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supermemory/, ''),
      },
    },
  },
})
