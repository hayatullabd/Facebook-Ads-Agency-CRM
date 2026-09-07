import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const deploymentEnv = loadEnv(mode, process.cwd(), '')

  return {
    base: deploymentEnv.VITE_PUBLIC_BASE || '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: { proxy: { "/api": { target: deploymentEnv.API_PROXY_TARGET || "http://127.0.0.1:5001", changeOrigin: true }, "/health": { target: deploymentEnv.API_PROXY_TARGET || "http://127.0.0.1:5001", changeOrigin: true } } },
    assetsInclude: ['**/*.svg', '**/*.csv'],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('react-router') || id.includes('react-dom') || /node_modules[\\/]react[\\/]/.test(id)) return 'react'
          },
        },
      },
    },
  }
})
