import express from "express";
import type { NextFunction, Request, Response } from "express";
import path from "node:path";
import { attachSession, requireSameOrigin } from "./auth.ts";
import { HttpError } from "./http.ts";
import { requestLogger, securityHeaders } from "./security.ts";
import { authRouter } from "./routes/auth.ts";
import { matchesRouter } from "./routes/matches.ts";
import { aiRouter } from "./routes/ai.ts";
import { devRouter } from "./routes/dev.ts";
import { closeDb, initDb } from "./db.ts";

const PROD = process.env.NODE_ENV === "production";

export async function createApp() {
  initDb();

  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

  app.use(securityHeaders);
  app.use(requestLogger);
  app.use(express.json({ limit: process.env.MAX_BODY_SIZE || "10mb" }));

  // Health probe for load balancers and uptime checks
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "matchvision-web", uptime: Math.round(process.uptime()) });
  });

  app.use(attachSession);
  app.use("/api", requireSameOrigin);

  app.use("/api/auth", authRouter);
  app.use("/api/matches", matchesRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/dev", devRouter);

  // Unknown API routes must never fall through to the SPA shell
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "not_found", message: "Unknown API endpoint." });
  });

  if (!PROD) {
    // Vite is a dev-only dependency; load it lazily so production images stay lean
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (/\/assets\/.+\.(js|css|woff2?)$/.test(filePath)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      })
    );
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Central error handler: never leak stack traces to clients
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.code, message: error.message });
      return;
    }
    const status = (error as any)?.status || 500;
    if (status === 400) {
      res.status(400).json({ error: "invalid_request", message: "Malformed request body." });
      return;
    }
    console.error("[error]", error);
    res.status(500).json({ error: "internal_error", message: "Something went wrong on our side." });
  });

  return app;
}

export function shutdown(): void {
  try {
    closeDb();
  } catch {
    /* ignore */
  }
}
