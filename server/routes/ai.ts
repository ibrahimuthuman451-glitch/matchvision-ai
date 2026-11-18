import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { MODELS, resolveModel } from "../config.ts";
import { currentUser, requireAuth } from "../auth.ts";
import { rateLimit } from "../security.ts";
import { asyncHandler } from "../http.ts";

export const aiRouter = Router();

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SYSTEM_TACTICAL = `You are MatchVision AI's senior tactical analyst.
You reason over pitch tracking data, formations, defensive line height, compactness, xG,
xT (expected threat) and pressing intensity (PPDA).
Answer with concise, evidence-led tactical bullet points and actionable coaching advice.
Never invent player names or numbers that are not present in the supplied match context.`;

const SYSTEM_BROADCAST = `You are MatchVision AI's broadcast director copilot.
You draft punchy, professional on-screen graphics for lower thirds, tactical banners,
incident alerts and live tickers. Keep copy short enough for television.
When recommending a graphic, start with a single-line TITLE, then a one-line SUBTITLE.`;

function contextSummary(matchContext: unknown): string {
  if (!matchContext || typeof matchContext !== "object") return "No match context supplied.";
  try {
    return JSON.stringify(matchContext).slice(0, 6000);
  } catch {
    return "Match context could not be serialised.";
  }
}

function offlineTactical(prompt: string, matchContext: any): string {
  const lines: string[] = [
    "**Offline tactical summary** — no `GEMINI_API_KEY` is configured, so this response is generated from your submitted match context only.",
    "",
  ];

  const stats = matchContext?.teamStats || matchContext?.stats;
  if (Array.isArray(stats)) {
    for (const team of stats.slice(0, 2)) {
      lines.push(
        `- **${team?.teamName || team?.name || "Team"}**: defensive line ${
          team?.defLineHeightM ?? team?.defensive_line_height_m ?? "n/a"
        }, PPDA ${team?.ppda ?? "n/a"}, possession ${team?.possessionPct ?? "n/a"}%.`
      );
    }
  }

  const fatigued = matchContext?.topFatiguedPlayers;
  if (Array.isArray(fatigued) && fatigued.length > 0) {
    lines.push("", "**Fatigue watchlist**");
    for (const p of fatigued.slice(0, 5)) {
      lines.push(
        `- ${p?.name ?? "Player"} (${p?.team ?? "unknown team"}): ${p?.fatigue ?? "n/a"} load, ${
          p?.distance ?? "n/a"
        } covered, ${p?.sprints ?? "n/a"} sprints.`
      );
    }
  }

  const subs = matchContext?.suggestedSubs;
  if (Array.isArray(subs) && subs.length > 0) {
    lines.push("", "**Suggested changes**");
    for (const s of subs.slice(0, 3)) {
      lines.push(`- OUT ${s?.out ?? "n/a"} → IN ${s?.in ?? "n/a"} (${s?.timing ?? "review"}).`);
    }
  }

  lines.push(
    "",
    `Your question: “${prompt.slice(0, 220)}”. Configure GEMINI_API_KEY and restart the server for generative analysis.`
  );
  return lines.join("\n");
}

aiRouter.get("/status", (_req, res) => {
  res.json({ configured: Boolean(ai), models: MODELS });

aiRouter.post(
  "/tactical-query",
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 30, name: "tactical" }),
  asyncHandler(async (req, res) => {
    const user = currentUser(res);
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!prompt) {
      res.status(400).json({ error: "prompt_required", message: "A prompt is required." });
      return;
    }
    const matchContext = req.body?.matchContext;

    if (!ai) {
      res.json({
        answer: offlineTactical(prompt, matchContext),
        model: "offline-rules-engine",
        offline: true,
      });
      return;
    }

    const fullPrompt = `Workspace: ${user.orgName}\nMatch context:\n${contextSummary(
      matchContext
    )}\n\nQuestion:\n${prompt}`;

    try {
      const response = await ai.models.generateContent({
        model: MODELS.tactical,
        contents: `${SYSTEM_TACTICAL}\n\n${fullPrompt}`,
        config: { thinkingConfig: { thinkingLevel: "HIGH" as any } },
      });
      res.json({ answer: response.text || "No analysis generated.", model: MODELS.tactical });
    } catch (primaryError: any) {
      console.warn(`[ai] ${MODELS.tactical} failed:`, primaryError?.message || primaryError);
      try {
        const response = await ai.models.generateContent({
          model: MODELS.fallback,
          contents: `${SYSTEM_TACTICAL}\n\n${fullPrompt}`,
        });
        res.json({ answer: response.text || "No analysis generated.", model: MODELS.fallback });
      } catch (fallbackError: any) {
        console.warn(`[ai] ${MODELS.fallback} failed too:`, fallbackError?.message || fallbackError);
        res.status(502).json({
          error: "ai_unavailable",
          message: "The analysis service is temporarily unavailable. Please retry.",
        });
      }
    }
  })
);

aiRouter.post(
  "/broadcast-chat",
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 60, name: "broadcast" }),
  asyncHandler(async (req, res) => {
    const { messages, model, roleType = "director_copilot" } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages_required", message: "A message history is required." });
      return;
    }

    const lastUserMessage = String(messages[messages.length - 1]?.content || "").slice(0, 400);

    if (!ai) {
      res.json({
        reply: `[Offline mode] Graphic draft for: “${lastUserMessage.slice(0, 80)}”. Configure GEMINI_API_KEY for generated copy.`,
        model: "offline-broadcast-engine",
        offline: true,
        suggestedGraphic: {
          title: "TACTICAL UPDATE",
          subtitle: lastUserMessage.slice(0, 90) || "Live analysis from MatchVision AI",
          type: "lower_third",
        },
      });
      return;
    }

    let systemInstruction = SYSTEM_BROADCAST;
    if (roleType === "graphics_producer") {
      systemInstruction += " Focus on one or two sentence graphics copy only.";
    }

    const contents = messages.map((m: { role?: string; content?: string }) => ({
      role: m?.role === "assistant" || m?.role === "model" ? "model" : "user",
      parts: [{ text: String(m?.content ?? "").slice(0, 4000) }],
    }));

    const chosen = resolveModel(
      typeof model === "string" ? model : undefined,
      [MODELS.tactical, MODELS.broadcast, MODELS.lite],
      MODELS.broadcast
    );

    try {
      const response = await ai.models.generateContent({
        model: chosen,
        contents,
        config: { systemInstruction },
      });
      const reply = response.text || "Broadcast graphic generated.";
      const lines = reply.split("\n").filter((l) => l.trim().length > 0);
      res.json({
        reply,
        model: chosen,
        suggestedGraphic:
          lines.length >= 2
            ? {
                title: lines[0].replace(/^#+\s*|^Title:\s*|\*+/gi, "").trim().slice(0, 45),
                subtitle: lines[1].replace(/^Subtitle:\s*|\*+/gi, "").trim().slice(0, 90),
                type: "lower_third",
              }
            : null,
      });
    } catch (error: any) {
      console.warn(`[ai] broadcast ${chosen} failed:`, error?.message || error);
      res.status(502).json({
        error: "ai_unavailable",
        message: "The graphics service is temporarily unavailable. Please retry.",
      });
    }
  })
);

});
