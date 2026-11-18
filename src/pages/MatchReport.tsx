import React, { useEffect, useMemo, useState } from "react";
import { Link, navigate } from "../lib/router";
import { api, ApiError, type MatchDetail, type SessionUser, type Usage } from "../lib/api";
import { WorkspaceShell } from "./WorkspaceShell";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Download,
  Gauge,
  Loader2,
  MapPin,
  Play,
  Radio,
  Timer,
  Trophy,
  Users,
} from "lucide-react";

interface MatchReportProps {
  matchId: string;
  user: SessionUser;
  usage?: Usage;
  onLogout: () => void;
}

interface PlayerRow {
  track_id: number;
  team_id?: number | null;
  distance_m?: number;
  max_speed_kmh?: number;
  avg_speed_kmh?: number;
  sprints?: number;
  pitch_coords?: [number, number] | null;
}

interface TeamRow {
  team_id?: number;
  id?: number;
  team_name?: string;
  name?: string;
  defensive_line_height_m?: number;
  compactness_m2?: number;
  team_width_m?: number;
  team_length_m?: number;
  possession_pct?: number;
}

interface EventRow {
  event_type?: string;
  type?: string;
  frame_idx?: number;
  frame?: number;
  time_sec?: number;
  team_id?: number | null;
  player_id?: number | null;
  receiver_id?: number | null;
  x?: number;
  y?: number;
  is_successful?: boolean;
}

const num = (value: unknown, digits = 1, fallback = "—") => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : fallback;
};

const teamName = (id: number | null | undefined) =>
  id === 0 ? "Team A" : id === 1 ? "Team B" : id === 2 ? "Referee" : "—";


export const MatchReport: React.FC<MatchReportProps> = ({ matchId, user, usage, onLogout }) => {
  const [data, setData] = useState<{ match: MatchDetail; payload: Record<string, any> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.matches
      .get(matchId)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this match."));
  }, [matchId]);

  const derived = useMemo(() => {
    const payload = data?.payload || {};
    const players: PlayerRow[] = Array.isArray(payload.players) ? payload.players : [];
    const teams: TeamRow[] = Array.isArray(payload.team_metrics)
      ? payload.team_metrics
      : Array.isArray(payload.teams)
      ? payload.teams
      : [];
    const events: EventRow[] = Array.isArray(payload.events) ? payload.events : [];

    const totalDistance = players.reduce((sum, p) => sum + (Number(p.distance_m) || 0), 0);
    const topSpeed = players.reduce((best, p) => Math.max(best, Number(p.max_speed_kmh) || 0), 0);
    const eventCounts = events.reduce<Record<string, number>>((acc, event) => {
      const key = event.event_type || event.type || "event";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topPlayers = [...players]
      .sort((a, b) => (Number(b.distance_m) || 0) - (Number(a.distance_m) || 0))
      .slice(0, 12);

    return {
      players,
      teams,
      events,
      totalDistance,
      topSpeed,
      eventCounts,
      topPlayers,
      calibration: payload?.video?.calibration || payload?.calibration_status || "Unknown",
      frames: payload?.video?.frames ?? payload?.processed_frames,
    };
  }, [data]);

  return (
    <WorkspaceShell user={user} usage={usage} onLogout={onLogout} active="library">
      <div className="mx-auto max-w-6xl px-5 lg:px-8 py-8">
        <Link to="/app/library" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Match library
        </Link>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {!data && !error && (
          <div className="mt-16 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading match report…
          </div>
        )}

        {data && (
          <>
            <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">{data.match.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  {data.match.competition && (
                    <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />{data.match.competition}</span>
                  )}
                  {data.match.playedAt && (
                    <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{data.match.playedAt}</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" /> Calibration: {String(derived.calibration)}
                  </span>
                  {derived.frames !== undefined && (
                    <span className="inline-flex items-center gap-1"><Timer className="w-3.5 h-3.5" />{String(derived.frames)} frames</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/app/studio/${data.match.id}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                >
                  <Play className="w-3.5 h-3.5" /> Open in studio
                </button>
                <a
                  href={api.matches.exportUrl(data.match.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </a>
                <button
                  onClick={() => navigate("/app/library")}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Back to library
                </button>
              </div>
            </header>

            <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={Users} label="Players tracked" value={String(derived.players.length)} hint="Unique track IDs" />
              <Kpi icon={MapPin} label="Distance covered" value={`${num(derived.totalDistance / 1000, 2)} km`} hint="All tracked players" />
              <Kpi icon={Gauge} label="Top speed" value={`${num(derived.topSpeed)} km/h`} hint="Fastest recorded player" />
              <Kpi icon={Radio} label="Events detected" value={String(derived.events.length)} hint="Technical & tactical" />
            </section>

            {derived.teams.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-bold text-white">Team shape</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-white/5 bg-slate-900/50">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/60 text-[10px] uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-bold">Team</th>
                        <th className="px-4 py-2.5 font-bold">Defensive line</th>
                        <th className="px-4 py-2.5 font-bold">Compactness</th>
                        <th className="px-4 py-2.5 font-bold">Width</th>
                        <th className="px-4 py-2.5 font-bold">Length</th>
                        <th className="px-4 py-2.5 font-bold">Possession</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {derived.teams.map((team, idx) => {
                        const id = team.team_id ?? team.id ?? idx;
                        return (
                          <tr key={`${id}-${idx}`}>
                            <td className="px-4 py-2.5 font-semibold text-slate-100">
                              {team.team_name || team.name || teamName(id)}
                            </td>
                            <td className="px-4 py-2.5 text-slate-300">{num(team.defensive_line_height_m)} m</td>
                            <td className="px-4 py-2.5 text-slate-300">{num(team.compactness_m2)} m²</td>
                            <td className="px-4 py-2.5 text-slate-300">{num(team.team_width_m)} m</td>
                            <td className="px-4 py-2.5 text-slate-300">{num(team.team_length_m)} m</td>
                            <td className="px-4 py-2.5 text-slate-300">{num(team.possession_pct)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h2 className="text-sm font-bold text-white">Most active players</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-white/5 bg-slate-900/50">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/60 text-[10px] uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-bold">Track</th>
                        <th className="px-4 py-2.5 font-bold">Team</th>
                        <th className="px-4 py-2.5 font-bold">Distance</th>
                        <th className="px-4 py-2.5 font-bold">Max speed</th>
                        <th className="px-4 py-2.5 font-bold">Sprints</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {derived.topPlayers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">
                            No player rows in this artefact.
                          </td>
                        </tr>
                      ) : (
                        derived.topPlayers.map((player) => (
                          <tr key={player.track_id}>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-200">#{player.track_id}</td>
                            <td className="px-4 py-2.5 text-slate-400">{teamName(player.team_id)}</td>
                            <td className="px-4 py-2.5 text-slate-300">{num((Number(player.distance_m) || 0) / 1000, 2)} km</td>
                            <td className="px-4 py-2.5 text-slate-300">{num(player.max_speed_kmh)} km/h</td>
                            <td className="px-4 py-2.5 text-slate-300">{player.sprints ?? "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-white">Event mix</h2>
                <div className="mt-3 rounded-xl border border-white/5 bg-slate-900/50 p-4">
                  {Object.keys(derived.eventCounts).length === 0 ? (
                    <p className="text-xs text-slate-500">No events were detected in this artefact.</p>
                  ) : (
                    <ul className="space-y-2">
                      {Object.entries(derived.eventCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, count]) => (
                          <li key={type} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-300">{eventLabel(type)}</span>
                            <span className="font-mono font-bold text-cyan-300">{count}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
                <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                  Metrics are computed by the MatchVision engine. If calibration was degraded, pitch
                  distances are approximate and the artefact records that status.
                </p>
              </div>
            </section>
            {derived.events.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-bold text-white">Latest events</h2>
                <div className="mt-3 divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-900/50">
                  {derived.events
                    .slice()
                    .sort((a, b) => Number(b.frame_idx ?? b.frame ?? 0) - Number(a.frame_idx ?? a.frame ?? 0))
                    .slice(0, 15)
                    .map((event, idx) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs">
                        <span className="font-semibold text-slate-200">{eventLabel(event.event_type || event.type || "event")}</span>
                        <span className="font-mono text-slate-500">
                          {teamName(event.team_id)} · player #{event.player_id ?? "—"} · frame{" "}
                          {event.frame_idx ?? event.frame ?? "—"}
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </WorkspaceShell>
  );
};

const Kpi: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string }> = ({
  icon: Icon,
  label,
  value,
  hint,
}) => (
  <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      <Icon className="w-3.5 h-3.5 text-cyan-400" /> {label}
    </div>
    <p className="mt-2 text-2xl font-black text-white font-mono">{value}</p>
    <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
  </div>
);

const eventLabel = (type: string) => type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
