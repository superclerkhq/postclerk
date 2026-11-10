import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const server = "http://127.0.0.1:3001"

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: { proxy: { "/api": server, "/upload": server } },
})
