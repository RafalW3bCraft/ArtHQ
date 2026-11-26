import express, { type Express } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Server } from "node:http";
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });
  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    if (req.method !== "GET") return res.status(404).end();
    try {
      const template = await readFile(
        path.resolve("client/index.html"),
        "utf8",
      );
      res
        .type("html")
        .send(await vite.transformIndexHtml(req.originalUrl, template));
    } catch (error) {
      next(error);
    }
  });
}
export function serveStatic(app: Express) {
  const directory = path.resolve(import.meta.dirname, "public");
  app.use(express.static(directory, { index: false }));
  app.use((req, res) =>
    req.method === "GET"
      ? res.sendFile(path.join(directory, "index.html"))
      : res.status(404).end(),
  );
}
