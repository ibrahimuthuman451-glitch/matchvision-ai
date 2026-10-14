import React, { useState } from "react";
import { TeamStats, BroadcastGraphic } from "../types/match";
import {
  BarChart3,
  Shield,
  Flame,
  Activity,
  Swords,
  Box,
  TrendingUp,
  Radio,
  Crosshair,
} from "lucide-react";

interface TeamComparisonProps {
  stats: TeamStats[];
  onTransmitToScreen?: (graphic: BroadcastGraphic) => void;
}

export const TeamComparison: React.FC<TeamComparisonProps> = ({
  stats,
  onTransmitToScreen,
}) => {
  const [category, setCategory] = useState<"duels" | "box" | "overview" | "progression">(
    "duels"
  );
  const teamA = stats[0];
  const teamB = stats[1];

  const MetricRow = ({
    label,
    valA,
    valB,
    unit = "",
    higherIsBetter = true,
  }: {
    label: string;
    valA: number;
    valB: number;
    unit?: string;
    higherIsBetter?: boolean;
  }) => {
    const total = valA + valB;
    const pctA = total > 0 ? (valA / total) * 100 : 50;

    const handleRowClick = () => {
      if (!onTransmitToScreen) return;
      const graphic: BroadcastGraphic = {
        id: `BG-TEAM-METRIC-${Date.now()}`,
        type: "tactical_banner",
        title: `TEAM STAT COMPARISON: ${label.toUpperCase()}`,
        subtitle: `Arsenal: ${valA}${unit} vs Man City: ${valB}${unit} — MatchVision Opta Tactical Engine`,
        accentColor: "#06b6d4",
        badgeText: "TACTICAL METRIC",
        isOnAir: true,
        position: "bottom",
        targetDevice: "all",
        timestamp: new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
        author: "Team Comparison",
      };
      onTransmitToScreen(graphic);
    };

    return (
      <div
        onClick={handleRowClick}
        className="py-1.5 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 px-1.5 rounded cursor-pointer transition-colors group"
        title="Click to push this comparison to Spectacles TV & Broadcast Screen"
      >
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-mono font-bold text-red-400">
            {valA}
            {unit}
          </span>
          <span className="text-[11px] text-slate-400 group-hover:text-cyan-300 transition-colors uppercase tracking-wider flex items-center gap-1">
            {label}
            {onTransmitToScreen && (
              <Radio className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-cyan-400" />
            )}
          </span>
          <span className="font-mono font-bold text-sky-400">
            {valB}
            {unit}
          </span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800">
          <div
            className="bg-red-500 transition-all duration-300"
            style={{ width: `${pctA}%` }}
          />
          <div
            className="bg-sky-400 transition-all duration-300"
            style={{ width: `${100 - pctA}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100">TEAM TACTICAL COMPARISON</h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold font-mono">
          <span className="text-red-400">ARSENAL</span>
          <span className="text-slate-600">vs</span>
          <span className="text-sky-400">MAN CITY</span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="grid grid-cols-4 gap-1 my-2.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
        <button
          onClick={() => setCategory("duels")}
          className={`py-1 rounded text-center transition-colors flex items-center justify-center gap-1 ${
            category === "duels"
              ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Swords className="w-3 h-3" />
          Duels
        </button>
        <button
          onClick={() => setCategory("box")}
          className={`py-1 rounded text-center transition-colors flex items-center justify-center gap-1 ${
            category === "box"
              ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Box className="w-3 h-3" />
          Box Actions
        </button>
        <button
          onClick={() => setCategory("progression")}
          className={`py-1 rounded text-center transition-colors flex items-center justify-center gap-1 ${
            category === "progression"
              ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          Progression
        </button>
        <button
          onClick={() => setCategory("overview")}
          className={`py-1 rounded text-center transition-colors flex items-center justify-center gap-1 ${
            category === "overview"
              ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3 h-3" />
          Overview
        </button>
      </div>

      {/* Metric List */}
      <div className="flex-1 space-y-0.5 overflow-y-auto pr-1">
        {category === "duels" && (
          <>
            <MetricRow
              label="Ground Duels Won"
              valA={teamA.groundDuelsWon}
              valB={teamB.groundDuelsWon}
            />
            <MetricRow
              label="Ground Duels Win Rate"
              valA={Math.round((teamA.groundDuelsWon / teamA.groundDuelsTotal) * 100)}
              valB={Math.round((teamB.groundDuelsWon / teamB.groundDuelsTotal) * 100)}
              unit="%"
            />
            <MetricRow
              label="Aerial Duels Won"
              valA={teamA.aerialDuelsWon}
              valB={teamB.aerialDuelsWon}
            />
            <MetricRow
              label="Aerial Duels Win Rate"
              valA={Math.round((teamA.aerialDuelsWon / teamA.aerialDuelsTotal) * 100)}
              valB={Math.round((teamB.aerialDuelsWon / teamB.aerialDuelsTotal) * 100)}
              unit="%"
            />
            <MetricRow
              label="Tackles Won"
              valA={teamA.tacklesWon}
              valB={teamB.tacklesWon}
            />
            <MetricRow
              label="Interceptions"
              valA={teamA.interceptions}
              valB={teamB.interceptions}
            />
            <MetricRow
              label="Ball Recoveries"
              valA={teamA.recoveries}
              valB={teamB.recoveries}
            />
          </>
        )}

        {category === "box" && (
          <>
            <MetricRow
              label="Touches in Opponent Box"
              valA={teamA.touchesInOppBox}
              valB={teamB.touchesInOppBox}
            />
            <MetricRow
              label="Passes into Penalty Box"
              valA={teamA.passesIntoBox}
              valB={teamB.passesIntoBox}
            />
            <MetricRow
              label="Big Chances Created"
              valA={teamA.bigChancesCreated}
              valB={teamB.bigChancesCreated}
            />
            <MetricRow
              label="Crosses Completed"
              valA={teamA.crossesCompleted}
              valB={teamB.crossesCompleted}
            />
            <MetricRow
              label="Total Shots (On Target)"
              valA={teamA.shotsOnTarget}
              valB={teamB.shotsOnTarget}
            />
            <MetricRow
              label="Corner Kicks"
              valA={teamA.corners}
              valB={teamB.corners}
            />
          </>
        )}

        {category === "progression" && (
          <>
            <MetricRow
              label="Progressive Passes (>10m)"
              valA={teamA.progressivePasses}
              valB={teamB.progressivePasses}
            />
            <MetricRow
              label="Progressive Carries (>10m)"
              valA={teamA.progressiveCarries}
              valB={teamB.progressiveCarries}
            />
            <MetricRow
              label="Passes into Final Third"
              valA={teamA.passesIntoFinalThird}
              valB={teamB.passesIntoFinalThird}
            />
            <MetricRow
              label="Field Tilt (Final 3rd)"
              valA={teamA.fieldTiltPct}
              valB={teamB.fieldTiltPct}
              unit="%"
            />
            <MetricRow
              label="Expected Threat (xT Sum)"
              valA={1.84}
              valB={1.46}
            />
          </>
        )}

        {category === "overview" && (
          <>
            <MetricRow
              label="Possession"
              valA={teamA.possessionPct}
              valB={teamB.possessionPct}
              unit="%"
            />
            <MetricRow
              label="Defensive Line Height"
              valA={teamA.defLineHeightM}
              valB={teamB.defLineHeightM}
              unit="m"
            />
            <MetricRow
              label="Team Compactness"
              valA={teamA.compactnessM2}
              valB={teamB.compactnessM2}
              unit="m²"
              higherIsBetter={false}
            />
            <MetricRow
              label="Expected Goals (xG)"
              valA={teamA.xgTotal}
              valB={teamB.xgTotal}
            />
            <MetricRow
              label="Pressing Intensity (PPDA)"
              valA={teamA.ppda}
              valB={teamB.ppda}
              higherIsBetter={false}
            />
          </>
        )}
      </div>

      {/* Quick Tactical Callout */}
      <div className="mt-3 p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 flex items-start gap-1.5 font-mono">
        <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          Click any row to broadcast directly to Spectacles TV. Arsenal winning{" "}
          <strong className="text-cyan-300">
            {Math.round((teamA.groundDuelsWon / teamA.groundDuelsTotal) * 100)}%
          </strong>{" "}
          ground duels and recorded{" "}
          <strong className="text-amber-300">{teamA.touchesInOppBox}</strong> box touches.
        </span>
      </div>
    </div>
  );
};
