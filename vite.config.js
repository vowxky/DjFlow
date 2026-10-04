import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        info: resolve(__dirname, 'info.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
