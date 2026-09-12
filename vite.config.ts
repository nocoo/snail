import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { localApi } from "./scripts/local-api.ts";

export default defineConfig({
  plugins: [tailwindcss(), react(), localApi()],
  server: {
    port: 7051,
    strictPort: true,
    host: "127.0.0.1",
    allowedHosts: ["snail.dev.hexly.ai"],
    watch: {
      ignored: [
        "**/.artifacts/**",
        "**/.wrangler/**",
        "**/playwright-report/**",
        "**/test-results/**",
      ],
    },
  },
  build: { target: "es2022", sourcemap: false },
});
