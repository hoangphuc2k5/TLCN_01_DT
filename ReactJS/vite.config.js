import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('antd') || id.includes('@ant-design')) {
              return 'vendor-antd';
            }
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('@reduxjs') ||
              id.includes('react-redux')
            ) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    // Proxy API qua cùng origin → Cloudflare Tunnel chỉ cần trỏ frontend
    proxy: {
      '/v1': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/v1': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
