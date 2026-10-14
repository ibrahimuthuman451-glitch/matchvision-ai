import React, { useState } from "react";
import { Player, BroadcastGraphic } from "../types/match";
import {
  Activity,
  Gauge,
  Footprints,
  Target,
  Compass,
  X,
  Shield,
  Swords,
  Box,
  TrendingUp,
  Radio,
  Flame,
  Zap,
  Glasses,
} from "lucide-react";

interface PlayerInspectorProps {
  player: Player | null;
  onClose: () => void;
  onTransmitToScreen?: (graphic: BroadcastGraphic) => void;
}

export const PlayerInspector: React.FC<PlayerInspectorProps> = ({
  player,
  onClose,
  onTransmitToScreen,
}) => {
  const [activeStatTab, setActiveStatTab] = useState<"duels" | "box_attack" | "physical">("duels");

  if (!player) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center text-slate-500 h-full min-h-[360px]">
        <Compass className="w-10 h-10 mb-2 opacity-30 animate-spin-slow" />
        <h4 className="text-sm font-semibold text-slate-300 mb-1">PLAYER TACTICAL INSPECTOR</h4>
        <p className="text-xs max-w-xs">
          Click any player on the tactical pitch or broadcast camera to view real-time duels (ground & air), box touches, and spatial tracking metrics.
        </p>
      </div>
    );
  }

  const teamBg =
    player.teamId === 0
      ? "bg-red-500/20 text-red-300 border border-red-500/30"
      : "bg-sky-500/20 text-sky-300 border border-sky-500/30";

  const groundWinPct =
    player.groundDuelsTotal > 0
      ? Math.round((player.groundDuelsWon / player.groundDuelsTotal) * 100)
      : 0;
  const aerialWinPct =
    player.aerialDuelsTotal > 0
      ? Math.round((player.aerialDuelsWon / player.aerialDuelsTotal) * 100)
      : 0;
  const tackleWinPct =
    player.tacklesTotal > 0
      ? Math.round((player.tacklesWon / player.tacklesTotal) * 100)
      : 0;

  // Handle instant push of this player's duels & box stats to Spectacles TV / Broadcast Screen
  const handlePushPlayerToScreen = () => {
    if (!onTransmitToScreen) return;
    const graphic: BroadcastGraphic = {
      id: `BG-PLAYER-${player.id}-${Date.now()}`,
      type: "player_card",
      title: `${player.name.toUpperCase()} (#${player.number}) — TACTICAL METRICS`,
      subtitle: `Ground Duels: ${player.groundDuelsWon}/${player.groundDuelsTotal} (${groundWinPct}%) · Aerial: ${player.aerialDuelsWon}/${player.aerialDuelsTotal} · Box Touches: ${player.touchesInOppBox} · Top Speed: ${player.speedKmh.toFixed(1)} km/h`,
      accentColor: player.teamId === 0 ? "#ef4444" : "#38bdf8",
      badgeText: "PLAYER OPTA RADAR",
      isOnAir: true,
      position: "bottom",
      targetDevice: "all",
      timestamp: new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
      author: "Player Inspector",
    };
    onTransmitToScreen(graphic);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shadow-md ${
              player.teamId === 0 ? "bg-red-600 text-white" : "bg-sky-400 text-slate-950"
            }`}
          >
            #{player.number}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              {player.name}
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${teamBg}`}>
                {player.teamName} · {player.role}
              </span>
            </h4>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span>TRACK ID: #{player.trackId}</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold">OPTA VERIFIED</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {onTransmitToScreen && (
            <button
              onClick={handlePushPlayerToScreen}
              className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-lg text-[10px] font-mono flex items-center gap-1 shadow-sm transition-transform active:scale-95"
              title="Push Player Stats to Spectacles TV & Screen"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">ON AIR</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs: Duels & Battles, Box & Attack, Physical & Motion */}
      <div className="grid grid-cols-3 gap-1 my-3 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
        <button
          onClick={() => setActiveStatTab("duels")}
          className={`py-1 rounded text-center transition-colors flex items-center justify-center gap-1 ${
            activeStatTab === "duels"
              ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Swords className="w-3 h-3" />
          Duels
        </button>
        <button
          onClick={() => setActiveStatTab("box_attack")}
          className={`py-1 rounded text-center transition-colors flex items-center justify-center gap-1 ${
            activeStatTab === "box_attack"
              ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Box className="w-3 h-3" />
          Box Attack
        </button>
        <button
          onClick={() => setActiveStatTab("physical")}
          className={`py-1 rounded text-center transition-colors flex items-center justify-center gap-1 ${
            activeStatTab === "physical"
              ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3 h-3" />
          Physical
        </button>
      </div>

      {/* TAB 1: DUELS (GROUND & AIR) */}
      {activeStatTab === "duels" && (
        <div className="flex flex-col gap-2.5">
          {/* Ground Duels Won Card */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Swords className="w-3.5 h-3.5 text-cyan-400" />
                Ground Duels Won
              </span>
              <span className="font-mono text-cyan-300 font-bold text-sm">
                {player.groundDuelsWon} / {player.groundDuelsTotal} ({groundWinPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${groundWinPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>Ground tackles, 1v1 contested balls</span>
              <span>Success rate</span>
            </div>
          </div>

          {/* Aerial Duels Won Card */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                Aerial Duels Won
              </span>
              <span className="font-mono text-purple-300 font-bold text-sm">
                {player.aerialDuelsWon} / {player.aerialDuelsTotal} ({aerialWinPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-purple-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${aerialWinPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>Headers won in open play & set pieces</span>
              <span>Success rate</span>
            </div>
          </div>

          {/* Defensive Pressures & Tackles 3-stat Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Tackles Won</span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {player.tacklesWon}/{player.tacklesTotal}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Interceptions</span>
              <span className="font-mono text-xs font-bold text-cyan-400">{player.interceptions}</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Recoveries</span>
              <span className="font-mono text-xs font-bold text-amber-400">{player.recoveries}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OPPONENT BOX ATTACK & THREAT */}
      {activeStatTab === "box_attack" && (
        <div className="flex flex-col gap-2.5">
          {/* Touches in Opponent Box Spotlight */}
          <div className="bg-gradient-to-r from-amber-950/40 to-slate-950 p-3 rounded-xl border border-amber-500/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Touches in Opponent Box
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Danger zone penalty box actions
                  </span>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-amber-400">
                  {player.touchesInOppBox}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">touches</span>
              </div>
            </div>
          </div>

          {/* xG, xA & xT Breakdown */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono block">xG (Goals)</span>
              <span className="font-mono text-xs font-extrabold text-red-400">
                {player.xg.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono block">xA (Assists)</span>
              <span className="font-mono text-xs font-extrabold text-sky-400">
                {player.xa.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono block">xT (Threat)</span>
              <span className="font-mono text-xs font-extrabold text-amber-400">
                +{player.xtContribution.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Key Passes & Dribbles */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Key Passes:</span>
              <span className="font-mono font-bold text-white">{player.keyPasses}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Final 3rd Passes:</span>
              <span className="font-mono font-bold text-white">{player.passesIntoFinalThird}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between col-span-2">
              <span className="text-slate-400 text-[11px]">Take-ons / Dribbles Completed:</span>
              <span className="font-mono font-bold text-cyan-300">
                {player.dribblesCompleted} / {player.dribblesTotal}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PHYSICAL & MOTION */}
      {activeStatTab === "physical" && (
        <div className="flex flex-col gap-2.5">
          {/* Speed & Distance Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Current Speed
                </span>
                <span className="font-mono text-slate-200 font-bold">
                  {player.speedKmh.toFixed(1)} km/h
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (player.speedKmh / 32) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-emerald-400" /> Distance
                </span>
                <span className="font-mono text-slate-200 font-bold">
                  {(player.distCoveredM / 1000).toFixed(2)} km
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                {player.sprintCount} Sprints (&gt;25.2 km/h)
              </div>
            </div>
          </div>

          {/* Progressive Passes & Progressive Carries */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">Progressive Passes</span>
              <span className="text-sm font-bold font-mono text-cyan-400">
                {player.progressivePasses}
              </span>
              <p className="text-[9px] text-slate-500 mt-0.5">&gt;10m line-breaking passes</p>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">Progressive Carries</span>
              <span className="text-sm font-bold font-mono text-purple-400">
                {player.progressiveCarries}
              </span>
              <p className="text-[9px] text-slate-500 mt-0.5">&gt;10m ball carries towards goal</p>
            </div>
          </div>

          {/* Pitch Coordinates */}
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> Pitch Coordinates:
            </span>
            <span className="font-mono text-slate-200 font-semibold">
              X: {player.x > 0 ? `+${player.x.toFixed(1)}` : player.x.toFixed(1)}m, Y:{" "}
              {player.y.toFixed(1)}m
            </span>
          </div>
        </div>
      )}

      {/* Footer Overall Summary */}
      <div className="mt-auto pt-3 border-t border-slate-800 flex items-center justify-between text-center text-xs font-mono">
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Pass Acc</span>
          <span className="font-bold text-slate-200">{player.passAcc}%</span>
        </div>
        <div className="w-px h-5 bg-slate-800" />
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Total Touches</span>
          <span className="font-bold text-slate-200">{player.touches}</span>
        </div>
        <div className="w-px h-5 bg-slate-800" />
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Pressures</span>
          <span className="font-bold text-amber-400">{player.pressures}</span>
        </div>
      </div>
    </div>
  );
};
