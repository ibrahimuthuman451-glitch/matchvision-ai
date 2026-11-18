import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { requireAuth } from "../auth.ts";
import { asyncHandler, HttpError } from "../http.ts";
import { rateLimit } from "../security.ts";

export const devRouter = Router();

const ENABLED = process.env.ENABLE_CODE_EXPLORER !== "false";

devRouter.use((_req, res, next) => {
  if (!ENABLED) {
    res.status(404).json({ error: "not_found", message: "Not available." });
    return;
  }
  next();
});

devRouter.use(requireAuth);

function requireWorkspaceAdmin(_req: any, res: any, next: any): void {
  if (!res.locals.user?.isAdmin) {
    next(new HttpError(403, "forbidden", "Workspace admin access is required."));
    return;
  }
  next();
}

devRouter.use(requireWorkspaceAdmin);

const ROOTS = ["ai", "config", "pipeline", "tests"];

function readFiles(dir: string): Array<Record<string, unknown>> {
  const absolute = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(absolute)) return [];
  return fs
    .readdirSync(absolute)
    .filter((file) => {
      const full = path.join(absolute, file);
      return fs.statSync(full).isFile() && /\.(py|ya?ml)$/.test(file);
    })
    .map((file) => {
      const full = path.join(absolute, file);
      return {
        filename: file,
        directory: dir,
        content: fs.readFileSync(full, "utf-8"),
        size: fs.statSync(full).size,
      };
    });
}

devRouter.get("/python-modules", (_req, res) => {
  const modules = ROOTS.flatMap(readFiles);
  res.json({ modules });
});

devRouter.post(
  "/run-tests",
  rateLimit({ windowMs: 60_000, max: 4, name: "tests" }),
  asyncHandler(
    (_req, res) =>
      new Promise<void>((resolve) => {
        execFile(
          "python3",
          ["main.py", "--mode", "test"],
          { timeout: 120_000, cwd: process.cwd() },
          (error, stdout, stderr) => {
            res.json({
              success: !error,
              stdout,
              stderr,
              exitCode: error ? (error as any).code ?? 1 : 0,
            });
            resolve();
          }
        );
      })
  )
);
