import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname, "client"),
  envDir: process.env.APP_ENV_DIR || import.meta.dirname,
  publicDir: path.resolve(import.meta.dirname, "public"),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth"],
          react: ["react", "react-dom", "react-dom/client"],
          markdown: ["react-markdown"],
        },
      },
    },
  },
  server: { fs: { strict: true, deny: ["**/.env*", "**/.git/**"] } },
});
