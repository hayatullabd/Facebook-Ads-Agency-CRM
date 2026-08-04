import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const deploymentEnv = loadEnv(mode, process.cwd(), '')
  const apiUrl = deploymentEnv.VITE_API_URL?.trim()
  if (mode === 'production') {
    if (!apiUrl) throw new Error('VITE_API_URL is required for production builds')
    let parsedApiUrl: URL
    try {
      parsedApiUrl = new URL(apiUrl)
    } catch {
      throw new Error('VITE_API_URL must be an absolute HTTPS URL for production builds')
    }
    if (parsedApiUrl.protocol !== 'https:') throw new Error('VITE_API_URL must be an absolute HTTPS URL for production builds')
  }

  return {
    base: deploymentEnv.VITE_PUBLIC_BASE || '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
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
