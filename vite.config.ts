import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// The server refuses a request whose Origin isn't its own Host, so the page's Host goes through as it is. A plain
// string target would rewrite it to 127.0.0.1:3001.
const server = { target: "http://127.0.0.1:3001", changeOrigin: false }

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: {
    proxy: {
      "/api": server,
      "/upload": server,
      "/mcp": server,
      "/config.json": server,
      "/signin": server,
      "/callback": server,
      "/signout": server,
    },
  },
})
