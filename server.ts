import { createApp, shutdown } from "./server/app.ts";

const PORT = Number(process.env.PORT || 3000);

const app = await createApp();

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[MatchVision] Web application listening on http://0.0.0.0:${PORT}`);
});

function graceful(signal: string) {
  console.log(`[MatchVision] ${signal} received, shutting down.`);
  server.close(() => {
    shutdown();
    process.exit(0);
  });
  // Force-exit if connections do not drain
  setTimeout(() => {
    shutdown();
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => graceful("SIGTERM"));
process.on("SIGINT", () => graceful("SIGINT"));
