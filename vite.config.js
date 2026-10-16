import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import apiLocal from './servidor/api.js'

// /api se atiende con el servidor de datos local (servidor/), sin depender de un backend externo.
export default defineConfig({
  plugins: [react(), tailwindcss(), apiLocal()],
  server: { port: 5174 },
  // En el servidor, nginx publica el puerto 80 y reenvía a este puerto interno.
  preview: { port: 4174, host: '127.0.0.1', allowedHosts: true },
})
