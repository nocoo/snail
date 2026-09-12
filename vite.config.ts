import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: { port: 7018, host: "127.0.0.1" },
  build: { target: "es2022", sourcemap: false },
});
