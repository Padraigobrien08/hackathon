import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// /api/* is proxied to the FastAPI backend, so no CORS or URL config needed in the frontend.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})
