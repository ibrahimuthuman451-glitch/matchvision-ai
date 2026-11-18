import type { Ball, MatchEvent, Player, TeamStats } from "../types/match";

export interface TimelineFrame {
  t: number;
  b?: [number, number] | null;
  p?: Record<string, [number, number]>;
}

export interface ArtefactMatchMeta {
  id: string;
  title: string;
  competition?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  playedAt?: string | null;
  source?: string;
  createdAt?: number;
}

export interface ArtefactPayload {
  schema?: string;
  generated_at?: string;
  players?: Array<Record<string, any>>;
  events?: Array<Record<string, any>>;
  team_metrics?: Array<Record<string, any>>;
  teams?: Array<Record<string, any>>;
  timeline?: TimelineFrame[];
  timeline_hz?: number | null;
  video?: { frames?: number; fps?: number; duration_sec?: number; calibration?: string };
  summary?: Record<string, any>;
}

export interface LoadedArtefact {
  meta: ArtefactMatchMeta;
  basePlayers: Player[];
  baseBall: Ball;
  events: MatchEvent[];
  stats: TeamStats[];
  timeline: TimelineFrame[];
  hasTimeline: boolean;
  durationSec: number;
  sampleRateHz: number | null;
  calibration: string | null;
  notes: string[];
}

const TEAM_COLORS: Record<number, { primary: string; secondary: string; name: string }> = {
  0: { primary: "#ef4444", secondary: "#7f1d1d", name: "Team A" },
  1: { primary: "#38bdf8", secondary: "#0c4a6e", name: "Team B" },
  2: { primary: "#facc15", secondary: "#713f12", name: "Referee" },
};

const EVENT_TYPE_MAP: Record<string, MatchEvent["type"]> = {
  pass: "pass",
  pass_complete: "pass",
  pass_completed: "pass",
  pass_incomplete: "pass",
  pass_failed: "pass",
  shot: "shot",
  shot_on_target: "shot",
  shot_off_target: "shot",
  turnover: "turnover",
  tackle: "tackle",
  interception: "interception",
  final_third_entry: "final_third_entry",
  box_entry: "box_entry",
  box_touch: "box_entry",
  progressive_carry: "progressive_carry",
  ground_duel: "ground_duel",
  aerial_duel: "aerial_duel",
};

const OUTCOME_MAP: Record<string, MatchEvent["outcome"]> = {
  success: "success",
  complete: "success",
  completed: "success",
  won: "won",
  on_target: "success",
  saved: "saved",
  blocked: "blocked",
  off_target: "off_target",
  missed: "off_target",
  intercepted: "intercepted",
  incomplete: "intercepted",
  lost: "lost",
};

export const formatClock = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampPitch = (coords: unknown): [number, number] | null => {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const x = toNumber(coords[0], NaN);
  const y = toNumber(coords[1], NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [Math.max(-55, Math.min(55, x)), Math.max(-36, Math.min(36, y))];
};

/** Roles are inferred from depth order: the deepest player is the keeper. */
function inferRoles(players: Player[]): void {
  for (const teamId of [0, 1]) {
    const squad = players.filter((p) => p.teamId === teamId);
    if (squad.length === 0) continue;
    const ownGoalSign = teamId === 0 ? -1 : 1;
    const ordered = [...squad].sort((a, b) => (a.x - b.x) * ownGoalSign);
    ordered.forEach((player, index) => {
      if (index === 0) player.role = "GK";
      else if (index <= 4) player.role = "DEF";
      else if (index <= Math.max(5, ordered.length - 3)) player.role = "MID";
      else player.role = "ATT";
    });
  }
}

export function buildArtefact(payload: ArtefactPayload, meta: ArtefactMatchMeta): LoadedArtefact {
  const notes: string[] = [];
  const rawPlayers = Array.isArray(payload.players) ? payload.players : [];
  const rawTeams = Array.isArray(payload.team_metrics)
    ? payload.team_metrics
    : Array.isArray(payload.teams)
    ? payload.teams
    : [];

  const teamNames: Record<number, string> = {};
  for (const team of rawTeams) {
    const id = toNumber(team.team_id ?? team.id, -1);
    if (id >= 0) teamNames[id] = String(team.team_name || team.name || TEAM_COLORS[id]?.name || `Team ${id}`);
  }

  const players: Player[] = rawPlayers
    .map((row, index) => {
      const trackId = toNumber(row.track_id ?? row.id, index + 1);
      const coords = clampPitch(row.pitch_coords) ?? [0, 0];
      const teamId = toNumber(row.team_id, 0);
      return {
        id: trackId,
        trackId,
        name: `Track ${trackId}`,
        number: trackId,
        role: "MID" as Player["role"],
        teamId,
        teamName: teamNames[teamId] || TEAM_COLORS[teamId]?.name || "Team",
        x: coords[0],
        y: coords[1],
        vx: 0,
        vy: 0,
        speedKmh: toNumber(row.avg_speed_kmh),
        distCoveredM: toNumber(row.distance_m),
        sprintCount: toNumber(row.sprints),
        touches: 0,
        passAcc: 0,
        xtContribution: 0,
        groundDuelsWon: 0,
        groundDuelsTotal: 0,
        aerialDuelsWon: 0,
        aerialDuelsTotal: 0,
        touchesInOppBox: 0,
        progressivePasses: 0,
        progressiveCarries: 0,
        tacklesWon: 0,
        tacklesTotal: 0,
        interceptions: 0,
        recoveries: 0,
        pressures: 0,
        keyPasses: 0,
        passesIntoFinalThird: 0,
        dribblesCompleted: 0,
        dribblesTotal: 0,
        xg: 0,
        xa: 0,
        bbox: [0, 0, 0, 0],
        footImgPt: [0, 0],
        history: [],
      } satisfies Player;
    })
    .sort((a, b) => a.id - b.id);

  inferRoles(players);
  if (players.length === 0) notes.push("The artefact contains no tracked players.");

  const playerByTrack = new Map(players.map((p) => [p.trackId, p]));
  const events: MatchEvent[] = [];
  let unsupportedEventTypes = 0;

  (payload.events || []).forEach((row, index) => {
    const rawType = String(row.event_type || row.type || "");
    const mapped = EVENT_TYPE_MAP[rawType];
    if (!mapped) {
      unsupportedEventTypes += 1;
      return;
    }
    const playerId = toNumber(row.player_id, 0);
    const player = playerByTrack.get(playerId);
    const teamId = toNumber(row.team_id, player?.teamId ?? 0);
    const coords = clampPitch([row.x, row.y]) ?? [player?.x ?? 0, player?.y ?? 0];
    const timeSec = toNumber(row.time_sec ?? row.timestamp_sec, 0);
    const outcome = OUTCOME_MAP[String(row.outcome || "").toLowerCase()] || "success";
    const label = rawType.replace(/_/g, " ");

    events.push({
      id: String(row.event_id || `EV-${index + 1}`),
      type: mapped,
      timestamp: formatClock(timeSec),
      timeSec,
      teamId,
      playerId,
      playerName: player ? player.name : `Track ${playerId}`,
      playerNumber: player?.number ?? playerId,
      x: coords[0],
      y: coords[1],
      outcome,
      xg: row.xg === null || row.xg === undefined ? undefined : toNumber(row.xg),
      speedKmh:
        row.shot_speed_kmh === null || row.shot_speed_kmh === undefined
          ? undefined
          : toNumber(row.shot_speed_kmh),
      description: `${label} · ${teamNames[teamId] || `Team ${teamId}`}${
        row.receiver_id ? ` → track ${row.receiver_id}` : ""
      }`,
    });
  });

  if (unsupportedEventTypes > 0) {
    notes.push(`${unsupportedEventTypes} event(s) used types this studio cannot render yet.`);
  }

  const stats: TeamStats[] = [0, 1].map((teamId) => {
    const row = rawTeams.find((t) => toNumber(t.team_id ?? t.id, -1) === teamId) || {};
    const palette = TEAM_COLORS[teamId];
    return {
      teamId,
      teamName: teamNames[teamId] || palette.name,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      possessionPct: toNumber(row.possession_pct ?? row.possessionPct),
      defLineHeightM: toNumber(row.defensive_line_height_m ?? row.defLineHeightM),
      compactnessM2: toNumber(row.compactness_m2),
      widthM: toNumber(row.team_width_m),
      lengthM: toNumber(row.team_length_m),
      xgTotal: toNumber(row.xg_total),
      fieldTiltPct: toNumber(row.field_tilt_pct),
      ppda: toNumber(row.ppda),
      shots: 0,
      shotsOnTarget: 0,
      completedPasses: 0,
      totalPasses: 0,
      groundDuelsWon: 0,
      groundDuelsTotal: 0,
      aerialDuelsWon: 0,
      aerialDuelsTotal: 0,
      touchesInOppBox: 0,
      progressivePasses: 0,
      progressiveCarries: 0,
      tacklesWon: 0,
      tacklesTotal: 0,
      interceptions: 0,
      recoveries: 0,
      passesIntoFinalThird: 0,
      passesIntoBox: 0,
      bigChancesCreated: 0,
      corners: 0,
      crossesCompleted: 0,
      crossesTotal: 0,
    } satisfies TeamStats;
  });

  const timeline = (Array.isArray(payload.timeline) ? payload.timeline : [])
    .filter((frame) => frame && Number.isFinite(toNumber(frame.t, NaN)))
    .map((frame) => ({ t: toNumber(frame.t), b: clampPitch(frame.b), p: frame.p }))
    .sort((a, b) => a.t - b.t);

  const lastEventSec = events.reduce((max, event) => Math.max(max, event.timeSec), 0);
  const videoDuration = toNumber(payload.video?.duration_sec);
  const durationSec = Math.max(
    videoDuration,
    timeline.length ? timeline[timeline.length - 1].t : 0,
    lastEventSec,
    1
  );

  const lastBall = timeline.length ? timeline[timeline.length - 1].b : null;
  const baseBall: Ball = {
    x: lastBall ? lastBall[0] : 0,
    y: lastBall ? lastBall[1] : 0,
    z: 0,
    vx: 0,
    vy: 0,
    speedKmh: 0,
    carrierTrackId: null,
    possessionTeamId: null,
    trajectory: [],
  };

  return {
    meta,
    basePlayers: players,
    baseBall,
    events,
    stats,
    timeline,
    hasTimeline: timeline.length >= 2,
    durationSec,
    sampleRateHz: payload.timeline_hz ?? null,
    calibration: payload.video?.calibration ? String(payload.video.calibration) : null,
    notes,
  };
}

export interface SampledFrame {
  players: Player[];
  ball: Ball;
}

/** Reconstructs the tracked snapshot for a moment in the match from the timeline. */
export function sampleArtefact(loaded: LoadedArtefact, timeSec: number): SampledFrame {
  const { timeline, basePlayers, baseBall } = loaded;
  if (!loaded.hasTimeline) {
    return { players: basePlayers, ball: baseBall };
  }

  const t = Math.max(0, Math.min(loaded.durationSec, Number.isFinite(timeSec) ? timeSec : 0));

  let low = 0;
  let high = timeline.length - 1;
  let index = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (timeline[mid].t <= t) {
      index = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const current = timeline[index];
  const next = timeline[Math.min(index + 1, timeline.length - 1)];
  const span = next.t - current.t;
  const alpha = span > 1e-6 ? Math.min(1, Math.max(0, (t - current.t) / span)) : 0;
  const previous = index > 0 ? timeline[index - 1] : null;

  const coordAt = (frame: TimelineFrame | null, trackId: number): [number, number] | null => {
    const value = frame?.p?.[String(trackId)];
    return Array.isArray(value) && value.length >= 2 ? [value[0], value[1]] : null;
  };

  const players = basePlayers.map((player) => {
    const startCoord = coordAt(current, player.trackId) ?? coordAt(next, player.trackId);
    const endCoord = coordAt(next, player.trackId) ?? startCoord;
    if (!startCoord || !endCoord) return player;

    const x = startCoord[0] + (endCoord[0] - startCoord[0]) * alpha;
    const y = startCoord[1] + (endCoord[1] - startCoord[1]) * alpha;

    const history: [number, number][] = [];
    for (let i = Math.max(0, index - 19); i <= index; i += 1) {
      const coord = coordAt(timeline[i], player.trackId);
      if (coord) history.push(coord);
    }
    history.push([x, y]);

    const prevCoord = coordAt(previous, player.trackId);
    const dt = previous ? current.t - previous.t : 0;
    let speedKmh = 0;
    if (prevCoord && dt > 0.01) {
      const dx = x - prevCoord[0];
      const dy = y - prevCoord[1];
      speedKmh = Math.min(45, (Math.sqrt(dx * dx + dy * dy) / dt) * 3.6);
    }

    return { ...player, x, y, speedKmh: Math.round(speedKmh * 10) / 10, history };
  });

  const ballStart = current.b ?? next.b ?? null;
  const ballEnd = next.b ?? ballStart;
  let ballX = baseBall.x;
  let ballY = baseBall.y;
  if (ballStart) {
    ballX = ballStart[0] + ((ballEnd?.[0] ?? ballStart[0]) - ballStart[0]) * alpha;
    ballY = ballStart[1] + ((ballEnd?.[1] ?? ballStart[1]) - ballStart[1]) * alpha;
  }

  const trajectory: [number, number][] = [];
  for (let i = Math.max(0, index - 19); i <= index; i += 1) {
    const coord = timeline[i].b;
    if (coord) trajectory.push(coord);
  }
  trajectory.push([ballX, ballY]);

  const prevBall = previous?.b ?? null;
  const dt = previous ? current.t - previous.t : 0;
  let ballSpeed = 0;
  if (prevBall && dt > 0.01) {
    const dx = ballX - prevBall[0];
    const dy = ballY - prevBall[1];
    ballSpeed = Math.min(45, (Math.sqrt(dx * dx + dy * dy) / dt) * 3.6);
  }

  let carrier = players.find((p) => Math.hypot(p.x - ballX, p.y - ballY) <= 2.2) ?? null;

  return {
    players,
    ball: {
      ...baseBall,
      x: ballX,
      y: ballY,
      speedKmh: Math.round(ballSpeed * 10) / 10,
      carrierTrackId: carrier ? carrier.trackId : null,
      possessionTeamId: carrier ? carrier.teamId : null,
      trajectory,
    },
  };
}
