import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"


export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  server: {
    allowedHosts: [
      'c1e0-2001-fb1-c2-59d2-55c7-aea6-bd52-b0db.ngrok-free.app'
    ]
  }
})
