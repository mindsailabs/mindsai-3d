import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.hdr', '**/*.exr'],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Raise warning threshold so vendor chunk (three.js ~550kB on its
    // own) doesn't trigger warnings. Still flagged above 800kB.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          // Three.js core gets its own chunk so browsers can cache it
          // long-term across deploys (app code changes, three doesn't).
          if (id.includes('three/build') || id.includes('/three/') ||
              id.includes('@react-three') ||
              id.includes('postprocessing')) {
            return 'vendor-three'
          }
          // React + react-router bundled together as a separate vendor chunk.
          if (id.includes('/react/') || id.includes('/react-dom/') ||
              id.includes('/react-router') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          // Form libs (zod + react-hook-form) — only used on Act 5 contact.
          if (id.includes('/zod/') || id.includes('react-hook-form') ||
              id.includes('@hookform')) {
            return 'vendor-forms'
          }
          // Rest of node_modules → small shared vendor chunk.
          return 'vendor-misc'
        },
      },
    },
  },
})
