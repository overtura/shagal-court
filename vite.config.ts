import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), cloudflare()],
  define: {
    "import.meta.env.VITE_PUBLIC_SHARING": JSON.stringify(process.env.VITE_PUBLIC_SHARING ?? (process.env.VERCEL ? "disabled" : "enabled")),
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
  worker: {
    format: "es",
  },
});
