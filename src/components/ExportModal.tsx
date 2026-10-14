import React from "react";
import { Download, FileJson, FileSpreadsheet, X, Tv } from "lucide-react";
import { Player, Ball, MatchEvent, TeamStats } from "../types/match";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  ball: Ball;
  events: MatchEvent[];
  stats: TeamStats[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  players,
  ball,
  events,
  stats,
}) => {
  if (!isOpen) return null;

  const exportTrackingJSON = () => {
    const payload = {
      schema_version: "1.2.0",
      generated_at: new Date().toISOString(),
      match_metadata: {
        competition: "Premier League",
        home_team: "Arsenal",
        away_team: "Manchester City",
        pitch_dimensions_meters: { length: 105.0, width: 68.0 },
        calibration_quality: 0.96,
      },
      current_frame: {
        ball: {
          pitch_coords_meters: { x: ball.x, y: ball.y, z: ball.z },
          velocity_mps: (ball.speedKmh / 3.6).toFixed(2),
          possession_team_id: ball.possessionTeamId,
          carrier_track_id: ball.carrierTrackId,
        },
        players: players.map((p) => ({
          track_id: p.trackId,
          team_id: p.teamId,
          jersey_number: p.number,
          name: p.name,
          role: p.role,
          pitch_coords_meters: { x: p.x, y: p.y },
          velocity_mps: { vx: p.vx, vy: p.vy },
          speed_kmh: p.speedKmh,
          distance_covered_m: p.distCoveredM,
          ground_duels: { won: p.groundDuelsWon, total: p.groundDuelsTotal },
          aerial_duels: { won: p.aerialDuelsWon, total: p.aerialDuelsTotal },
          touches_in_opp_box: p.touchesInOppBox,
          progressive_passes: p.progressivePasses,
          progressive_carries: p.progressiveCarries,
          tackles_won: p.tacklesWon,
          interceptions: p.interceptions,
          recoveries: p.recoveries,
          xg: p.xg,
          xa: p.xa,
        })),
      },
      team_analytics: stats,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matchvision_tracking_frame_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportEventsCSV = () => {
    const headers = ["event_id", "timestamp", "event_type", "team", "player_number", "player_name", "x_meters", "y_meters", "outcome", "xg"];
    const rows = events.map((e) => [
      e.id,
      e.timestamp,
      e.type,
      e.teamId === 0 ? "Arsenal" : "Man City",
      e.playerNumber,
      `"${e.playerName}"`,
      e.x.toFixed(1),
      e.y.toFixed(1),
      e.outcome,
      e.xg ? e.xg.toFixed(2) : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matchvision_events_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">DATA EXPORT & BROADCAST FEED</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {/* JSON Export */}
          <div
            onClick={exportTrackingJSON}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/50 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                  Export Real-Time Tracking JSON
                </h4>
                <p className="text-[11px] text-slate-400">
                  Full 22-player pitch coordinates, ball trajectory & spatial metrics
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
          </div>

          {/* CSV Export */}
          <div
            onClick={exportEventsCSV}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                  Export Match Events Stream (CSV)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Shots, xG scores, passes, tackles, and pressing turnovers
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
          </div>

          {/* vMix Mode Callout */}
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2.5">
            <Tv className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>
              vMix / OBS Broadcast Studio: Supports transparent chromakey output for direct SDI/NDI broadcast graphics overlay.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
