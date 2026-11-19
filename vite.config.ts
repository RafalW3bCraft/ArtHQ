import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
function serveHealth(server: Pick<ViteDevServer, "middlewares">) {
  server.middlewares.use((req, _res, next) => {
    if (req.url?.split("?")[0] === "/api/health") req.url = "/health.json";
    next();
  });
}
const health: Plugin = {
  name: "arthq-health",
  configureServer: serveHealth,
  configurePreviewServer: serveHealth,
};

export default defineConfig({
  root: local("./client"),
  envDir: local("./"),
  plugins: [react(), health],
  resolve: {
    alias: { "@": local("./client/src"), "@shared": local("./shared") },
  },
  build: { outDir: local("./dist/public"), emptyOutDir: true },
});
