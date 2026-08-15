import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  /* Bind all interfaces so http://localhost:5173 works alongside 127.0.0.1 (avoids some IPv6-only issues). */
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    /* Proxy API to local FastAPI so VITE_API_BASE_URL default /api/v1 works in dev */
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        /* Avoid hanging forever when uvicorn is not running */
        timeout: 15000,
      },
    },
  },

  build: {
    /* Split vendor libraries into separate cacheable chunks */
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || /\/react-dom\//.test(id) || /\/react\//.test(id)) {
              return 'vendor-react'
            }
            if (id.includes('zustand')) return 'vendor-zustand'
            if (id.includes('firebase')) return 'vendor-firebase'
            if (id.includes('@stripe')) return 'vendor-stripe'
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf'
            if (id.includes('react-simple-maps') || id.includes('d3-geo')) return 'vendor-maps'
            if (id.includes('@sentry')) return 'vendor-sentry'
            if (id.includes('/xlsx/') || id.includes('exceljs')) return 'vendor-xlsx'
            if (id.includes('tesseract')) return 'vendor-ocr'
            if (id.includes('heic2any')) return 'vendor-heic'
          }
          if (id.includes('/src/pages/auditPro/')) return 'audit-pro-pages'
        },
      },
    },
    /* Raise the warning limit — pages are now lazy-loaded */
    chunkSizeWarningLimit: 600,
    /* Improve minification */
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
  },

  /* Optimise dev server dependency pre-bundling */
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'countries-list', 'exceljs'],
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.test.*'],
    },
  },
})
