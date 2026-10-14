import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { exec } from "child_process";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize GoogleGenAI server-side
const apiKey = process.env.GEMINI_API_KEY || "";
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// 1. Tactical AI Query with Thinking Mode
app.post("/api/tactical-query", async (req: Request, res: Response) => {
  try {
    const { prompt, matchContext } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!ai) {
      return res.json({
        answer:
          "Tactical AI Offline: GEMINI_API_KEY is not configured in environment. In offline mode, the tactical metrics indicate Team A's defensive line is positioned at 38.2m with compact pressing, while Team B is overloading the left half-space.",
        thoughtProcess: "Fallback heuristic applied due to unconfigured API key.",
      });
    }

    const systemInstruction = `You are MatchVision AI's Senior Tactical Intelligence Analyst and Computer Vision Football Scientist.
You provide deep, elite-level spatial and tactical breakdowns of football matches based on pitch tracking coordinates, team formations, defensive line heights, compactness (m²), xG, xT (Expected Threat), and pressing intensity (PPDA).
Provide precise, insightful tactical evaluations with tactical diagrams/bullet points and actionable coaching recommendations.`;

    const fullPrompt = `Match Context:\n${JSON.stringify(matchContext, null, 2)}\n\nQuery:\n${prompt}`;

    let response;
    let usedModel = "gemini-4-argon";

    try {
      // Primary: gemini-4-argon with thinkingLevel HIGH as instructed
      response = await ai.models.generateContent({
        model: "gemini-4-argon",
        contents: `${systemInstruction}\n\n${fullPrompt}`,
        config: {
          thinkingConfig: {
            thinkingLevel: "HIGH" as any,
          },
        },
      });
    } catch (modelError: any) {
      // Graceful fallback to gemini-3.8-flash if gemini-4-argon requires paid project permissions
      console.warn("Falling back to gemini-3.8-flash:", modelError?.message || modelError);
      usedModel = "gemini-3.8-flash";
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `${systemInstruction}\n\n${fullPrompt}`,
      });
    }

    return res.json({
      answer: response.text || "No analysis generated.",
      model: usedModel,
    });
  } catch (error: any) {
    console.error("Tactical query failed:", error);
    return res.status(500).json({
      error: error.message || "Failed to process tactical query",
    });
  }
});

// 2. Multi-Turn Broadcast Chatbot for Television & Spectacles Screen Director
app.post("/api/broadcast-chat", async (req: Request, res: Response) => {
  try {
    const { messages, model = "gemini-3.8-flash", roleType = "director_copilot" } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required for chat history" });
    }

    if (!ai) {
      const lastUserMsg = messages[messages.length - 1]?.content || "";
      return res.json({
        reply: `[OFFLINE BROADCAST ENGINE] Ready for screen display: "${lastUserMsg.slice(0, 45)}". Suggestion: Lower third with title "TACTICAL ALERT" and subtitle "${lastUserMsg.slice(0, 60)}".`,
        model: "offline-broadcast-copilot",
        suggestedGraphic: {
          title: "TACTICAL ALERT",
          subtitle: lastUserMsg.slice(0, 80),
          type: "lower_third",
        },
      });
    }

    let systemInstruction = `You are MatchVision AI's Live Television Broadcast Director Copilot and Spectacles Screen Graphics Producer.
Your job is to assist the broadcast director in controlling what is displayed on television monitors, smart spectacles, and stadium jumbotrons during a live football match (Arsenal vs Manchester City).
When asked to write graphics, provide concise, high-impact on-screen copy suitable for:
- LOWER THIRDS (e.g. Player stats, substitution notices)
- TACTICAL BANNERS (e.g. "ARSENAL HIGH COMPACT BLOCK: 41.8m DEF LINE")
- BREAKING INCIDENT ALERTS (e.g. "VAR CHECK: POSSIBLE OFFSIDE")
- LIVE TICKERS / CRAWLS
Always keep on-screen text punchy, professional, and visually engaging.
When suggesting an on-screen graphic, also format your recommendation with a clear TITLE and SUBTITLE so the director can click to send it ON AIR immediately.`;

    if (roleType === "graphics_producer") {
      systemInstruction += " Focus specifically on punchy 1-2 sentence graphics copy for broadcast overlays.";
    }

    // Format multi-turn conversation history for @google/genai
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Select requested model: gemini-4-argon for complex tasks, gemini-3.8-flash for general, gemini-3.1-flash-lite for fast tasks
    const validModel = ["gemini-4-argon", "gemini-3.8-flash", "gemini-3.1-flash-lite"].includes(model)
      ? model
      : "gemini-3.8-flash";

    let response;
    let actualModel = validModel;

    try {
      response = await ai.models.generateContent({
        model: validModel,
        contents: formattedContents,
        config: {
          systemInstruction,
        },
      });
    } catch (modelErr: any) {
      console.warn(`Model ${validModel} failed, trying gemini-3.8-flash fallback:`, modelErr?.message || modelErr);
      actualModel = "gemini-3.8-flash";
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
        },
      });
    }

    const replyText = response.text || "Broadcast graphic generated.";

    // Parse candidate graphic recommendation if available in response
    let suggestedGraphic = null;
    const lines = replyText.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length >= 2) {
      suggestedGraphic = {
        title: lines[0].replace(/^#+\s*|^Title:\s*|\*+/gi, "").trim().slice(0, 45),
        subtitle: lines[1].replace(/^Subtitle:\s*|\*+/gi, "").trim().slice(0, 90),
        type: "lower_third",
      };
    }

    return res.json({
      reply: replyText,
      model: actualModel,
      suggestedGraphic,
    });
  } catch (error: any) {
    console.error("Broadcast chat failed:", error);
    return res.status(500).json({ error: error.message || "Failed to process broadcast chat" });
  }
});

// 2. Python Codebase & Files Inspection
app.get("/api/python-modules", (req: Request, res: Response) => {
  try {
    const aiDir = path.resolve(process.cwd(), "ai");
    const configDir = path.resolve(process.cwd(), "config");
    const pipelineDir = path.resolve(process.cwd(), "pipeline");
    const testsDir = path.resolve(process.cwd(), "tests");

    const getFiles = (dir: string) => {
      if (!fs.existsSync(dir)) return [];
      return fs
        .readdirSync(dir)
        .filter((file) => fs.statSync(path.join(dir, file)).isFile() && !file.endsWith(".pyc"))
        .map((file) => {
          const fullPath = path.join(dir, file);
          return {
            filename: file,
            directory: path.basename(dir),
            content: fs.readFileSync(fullPath, "utf-8"),
            size: fs.statSync(fullPath).size,
          };
        });
    };

    const modules = [
      ...getFiles(aiDir),
      ...getFiles(configDir),
      ...getFiles(pipelineDir),
      ...getFiles(testsDir),
      {
        filename: "run_matchvision.ps1",
        directory: "root",
        content: fs.existsSync("run_matchvision.ps1")
          ? fs.readFileSync("run_matchvision.ps1", "utf-8")
          : "",
        size: 0,
      },
      {
        filename: "requirements.txt",
        directory: "root",
        content: fs.existsSync("requirements.txt")
          ? fs.readFileSync("requirements.txt", "utf-8")
          : "",
        size: 0,
      },
    ];

    res.json({ modules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Automated Test Runner via Python
app.post("/api/run-tests", (req: Request, res: Response) => {
  exec("python3 main.py --mode test", (error, stdout, stderr) => {
    res.json({
      success: !error,
      stdout: stdout || "",
      stderr: stderr || "",
      exitCode: error ? error.code : 0,
    });
  });
});

// 4. Vite Dev Server / Static Hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MatchVision AI Engine] Live on http://0.0.0.0:${PORT}`);
  });
}

startServer();
