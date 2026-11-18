import { Router } from "express";
import {
  audit,
  countMatches,
  createMatch,
  deleteMatch,
  getMatch,
  listMatches,
} from "../db.ts";
import { currentUser, requireAuth } from "../auth.ts";
import { asString, asyncHandler, badRequest, notFound, HttpError } from "../http.ts";
import { rateLimit } from "../security.ts";

export const matchesRouter = Router();

matchesRouter.use(requireAuth);

const WRITE_LIMIT = rateLimit({ windowMs: 60_000, max: 60, name: "matches" });

interface PipelinePlayer {
  track_id: number;
  team_id?: number | null;
  pitch_coords?: [number, number] | null;
  distance_m?: number;
  avg_speed_kmh?: number;
  max_speed_kmh?: number;
  sprints?: number;
}

interface PipelinePayload {
  schema?: string;
  players?: PipelinePlayer[];
  events?: unknown[];
  timeline?: unknown[];
  teams?: Array<{ id?: number; name?: string }>;
  video?: { frames?: number };
  [key: string]: unknown;
}

function validatePayload(raw: unknown): PipelinePayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw badRequest("payload must be a JSON object produced by the MatchVision pipeline.");
  }
  const payload = raw as PipelinePayload;

  if (payload.schema && payload.schema !== "matchvision.match.v1") {
    throw badRequest(
      `Unsupported payload schema "${String(payload.schema)}". Expected matchvision.match.v1.`,
      "unsupported_schema"
    );
  }
  if (payload.players !== undefined && !Array.isArray(payload.players)) {
    throw badRequest("payload.players must be an array.");
  }
  if (payload.events !== undefined && !Array.isArray(payload.events)) {
    throw badRequest("payload.events must be an array.");
  }
  if (!payload.players && !payload.events) {
    throw badRequest("payload must include players or events.");
  }
  if ((payload.players?.length ?? 0) > 5000) {
    throw badRequest("payload contains too many players.");
  }
  if ((payload.events?.length ?? 0) > 20000) {
    throw badRequest("payload contains too many events.");
  }
  if (payload.timeline !== undefined) {
    if (!Array.isArray(payload.timeline)) throw badRequest("payload.timeline must be an array.");
    if (payload.timeline.length > 4000) {
      throw badRequest("payload.timeline has too many samples (max 4000).");
    }
    for (const sample of payload.timeline) {
      if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
        throw badRequest("Each timeline sample must be an object.");
      }
      const frame = sample as Record<string, unknown>;
      if (typeof frame.t !== "number" || !Number.isFinite(frame.t)) {
        throw badRequest("Each timeline sample needs a numeric t (seconds).");
      }
      if (frame.p !== undefined && (typeof frame.p !== "object" || Array.isArray(frame.p))) {
        throw badRequest("timeline sample p must map track ids to [x, y].");
      }
      const playersInFrame = frame.p ? Object.keys(frame.p as Record<string, unknown>).length : 0;
      if (playersInFrame > 60) {
        throw badRequest("A timeline sample has too many players.");
      }
    }
  }
  return payload;
}

matchesRouter.get("/", (req, res) => {
  const user = currentUser(res);
  res.json({ matches: listMatches(user.orgId) });
});

matchesRouter.post(
  "/",
  WRITE_LIMIT,
  asyncHandler(async (req, res) => {
    const user = currentUser(res);
    const title = asString(req.body?.title, "Match title", 160);
    const competition = req.body?.competition ? asString(req.body.competition, "Competition", 120) : null;
    const homeTeam = req.body?.homeTeam ? asString(req.body.homeTeam, "Home team", 120) : null;
    const awayTeam = req.body?.awayTeam ? asString(req.body.awayTeam, "Away team", 120) : null;
    const playedAt = req.body?.playedAt ? asString(req.body.playedAt, "Played at", 40) : null;
    const source = req.body?.source ? asString(req.body.source, "Source", 40) : "pipeline";

    const payload = validatePayload(req.body?.payload);

    const { PLAN_LIMITS } = await import("./auth.ts");
    const limit = PLAN_LIMITS[user.plan].matches;
    if (countMatches(user.orgId) >= limit) {
      throw new HttpError(
        402,
        "plan_limit_reached",
        `Your ${user.plan} plan includes ${limit} saved matches. Upgrade to add more.`
      );
    }

    const match = createMatch({
      orgId: user.orgId,
      ownerId: user.id,
      title,
      competition,
      homeTeam,
      awayTeam,
      playedAt,
      source,
      payload,
    });

    audit("match.create", { matchId: match.id, title }, user.orgId, user.id);
    res.status(201).json({ theMatch: shapeSummary(match, user.name) });
  })
);

function shapeSummary(
  match: ReturnType<typeof createMatch>,
  ownerName: string
): Record<string, unknown> {
  return {
    id: match.id,
    title: match.title,
    competition: match.competition,
    home_team: match.home_team,
    away_team: match.away_team,
    played_at: match.played_at,
    source: match.source,
    created_at: match.created_at,
    owner_name: ownerName,
  };
}

matchesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(res);
    const match = getMatch(user.orgId, req.params.id);
    if (!match) throw notFound("Match not found.");

    let payload: unknown = {};
    try {
      payload = JSON.parse(match.payload_json);
    } catch {
      payload = {};
    }

    res.json({
      match: {
        id: match.id,
        title: match.title,
        competition: match.competition,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        playedAt: match.played_at,
        source: match.source,
        createdAt: match.created_at,
      },
      payload,
    });
  })
);

matchesRouter.get(
  "/:id/export",
  asyncHandler(async (req, res) => {
    const user = currentUser(res);
    const match = getMatch(user.orgId, req.params.id);
    if (!match) throw notFound("Match not found.");

    const filename = `${match.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "match"}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(match.payload_json);
  })
);

matchesRouter.delete(
  "/:id",
  WRITE_LIMIT,
  asyncHandler(async (req, res) => {
    const user = currentUser(res);
    const match = getMatch(user.orgId, req.params.id);
    if (!match) throw notFound("Match not found.");
    if (match.owner_id !== user.id && !user.isAdmin) {
      throw new HttpError(403, "forbidden", "Only the uploader or a workspace admin can delete this match.");
    }
    deleteMatch(user.orgId, match.id);
    audit("match.delete", { matchId: match.id }, user.orgId, user.id);
    res.json({ ok: true });
  })
);
