import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/assets/warehousing/flexinventory/dist/', // Sesuaikan path asset Frappe
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: 'index.js',
        assetFileNames: 'index.[ext]'
      }
    }
  },
  server: {
    host: '0.0.0.0', // PENTING: Agar bisa diakses dari luar container
    port: 5173,
    watch: {
      usePolling: true,
    },
    // Proxy agar saat dev, request API diarahkan ke Frappe (port 8000)
    proxy: {
      '^/(api|method)': {
        target: '0.0.0.0',
        changeOrigin: true,
      }
    }
  }
})