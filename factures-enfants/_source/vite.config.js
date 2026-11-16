import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// L'appli est publiée par GitHub Pages depuis le dossier « docs » de la branche main.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: { pdfjs: ['pdfjs-dist'] } } },
  },
})
