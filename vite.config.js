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
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-zustand': ['zustand'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-maps': ['react-simple-maps'],
          'vendor-sentry': ['@sentry/react'],
          'vendor-xlsx': ['xlsx'],
          'vendor-ocr': ['tesseract.js', 'tesseract.js-core'],
          'vendor-heic': ['heic2any'],
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
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'countries-list'],
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
