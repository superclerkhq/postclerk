import path from "node:path"
import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// The Cloudflare plugin runs worker/index.ts in the Workers runtime beside the app, in development as in production.
export default defineConfig({
  plugins: [tailwindcss(), react(), cloudflare()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
})
