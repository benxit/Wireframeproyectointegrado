import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import apiLocal from './servidor/api.js'

// /api se atiende con el servidor de datos local (servidor/), sin depender de un backend externo.
export default defineConfig({
  plugins: [react(), tailwindcss(), apiLocal()],
  server: { port: 5174 },
  preview: { port: 4174 },
})
