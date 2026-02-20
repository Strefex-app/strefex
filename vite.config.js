import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

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
    include: ['react', 'react-dom', 'react-router-dom', 'zustand'],
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
})
