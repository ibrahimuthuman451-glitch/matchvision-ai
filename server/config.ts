import dotenv from "dotenv";

dotenv.config();

/** Real, GA Gemini model IDs. Override per deployment via environment variables. */
export const MODELS = {
  tactical: process.env.GEMINI_TACTICAL_MODEL || "gemini-2.5-pro",
  broadcast: process.env.GEMINI_BROADCAST_MODEL || "gemini-2.5-flash",
  lite: process.env.GEMINI_LITE_MODEL || "gemini-2.5-flash-lite",
  fallback: process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash",
};

/** Legacy UI identifiers kept as aliases so older clients keep working. */
export const MODEL_ALIASES: Record<string, string> = {
  "gemini-4-argon": MODELS.tactical,
  "gemini-3.8-flash": MODELS.broadcast,
  "gemini-3.1-flash-lite": MODELS.lite,
};

export function resolveModel(
  requested: string | undefined,
  allowed: string[],
  fallback: string
): string {
  if (!requested) return fallback;
  const resolved = MODEL_ALIASES[requested] || requested;
  return allowed.includes(resolved) ? resolved : fallback;
}

export const SITE = {
  name: process.env.SITE_NAME || "MatchVision AI",
  company: process.env.COMPANY_NAME || "MatchVision Labs Ltd",
  supportEmail: process.env.SUPPORT_EMAIL || "support@matchvision.ai",
  appUrl: process.env.APP_URL || "http://localhost:3000",
};
