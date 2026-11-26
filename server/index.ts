import "dotenv/config";
import { createServer } from "node:http";
import { createApplication } from "./business-api";
import { setupVite, serveStatic } from "./vite";

const app = createApplication();
const server = createServer(app);
if (process.env.NODE_ENV === "production") serveStatic(app);
else await setupVite(app, server);
const port = Number(process.env.PORT || 5000);
server.listen(port, "0.0.0.0", () =>
  console.log(`RafalWebCraft listening on port ${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
