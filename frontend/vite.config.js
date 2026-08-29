import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Permite que o build funcione em qualquer subdiretório (como no GitHub Pages: usuario.github.io/repositorio/)
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
