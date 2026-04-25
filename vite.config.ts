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
    // three.js bundles big (~800kB minified). Without this the build
    // warns at 500kB; raise to 1000kB so the warning is informative not
    // alarmist.
    //
    // NOTE: We previously had a manualChunks splitter (vendor-three /
    // vendor-react / vendor-forms / vendor-misc). It produced a clean
    // chunk graph in dev but crashed production with a TDZ error
    // ("Cannot access 'ko' before initialization") because troika-three-
    // text and other three-adjacent libs ended up in vendor-misc while
    // vendor-three referenced them, creating a circular init order.
    // Reverted — Vite's default code-splitting handles route-level
    // dynamic imports (Manifesto/Process/CaseStudy/NotFound) just fine
    // and avoids the circular-dep landmine.
    chunkSizeWarningLimit: 1000,
  },
})
