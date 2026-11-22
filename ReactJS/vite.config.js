import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');
          const antdComponent = normalizedId.match(/\/node_modules\/antd\/es\/([^/]+)\//)?.[1];
          if (antdComponent) {
            if (['form', 'date-picker'].includes(antdComponent)) return 'vendor-antd-form-core';
            if (['input', 'input-number', 'select', 'upload', 'radio', 'checkbox'].includes(antdComponent)) {
              return 'vendor-antd-fields';
            }
            if (['table', 'tree', 'list', 'pagination'].includes(antdComponent)) return 'vendor-antd-data';
          }
          if (normalizedId.includes('/node_modules/')) {
            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/react-router-dom/') ||
              normalizedId.includes('/node_modules/@reduxjs/') ||
              normalizedId.includes('/node_modules/react-redux/')
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
