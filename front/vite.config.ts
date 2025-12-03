import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Toda vez que o site tentar acessar /api, o Vite redireciona para o Backend
      '/api': {
        target: 'http://localhost:3000', // O endereço do seu Backend
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Remove o '/api' antes de mandar pro backend
      },
    },
  },
})