import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Optimize dependencies for faster startup
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'mapbox-gl'],
    exclude: [],
  },
  // Improve build performance
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
  },
  // Server configuration for faster HMR
  server: {
    hmr: {
      overlay: true,
    },
  },
})

