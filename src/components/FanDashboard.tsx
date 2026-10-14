import React, { useState } from "react";
import { Player, Ball, BroadcastGraphic, FanPoll } from "../types/match";
import { BroadcastCvView } from "./BroadcastCvView";
import {
  Glasses,
  Flame,
  TrendingUp,
  Heart,
  Vote,
  MessageCircle,
  Award,
  Zap,
  Target,
  Eye,
  Camera,
  Share2,
  Sparkles,
  Users,
  CheckCircle2,
  Tv,
} from "lucide-react";

interface FanDashboardProps {
  players: Player[];
  ball: Ball;
  activeGraphic: BroadcastGraphic | null;
  fanPolls: FanPoll[];
  onVotePoll: (pollId: string, optionIndex: number) => void;
  onTransmitToScreen?: (graphic: BroadcastGraphic) => void;
}

export const FanDashboard: React.FC<FanDashboardProps> = ({
  players,
  ball,
  activeGraphic,
  fanPolls,
  onVotePoll,
  onTransmitToScreen,
}) => {
  const [isArGlassMode, setIsArGlassMode] = useState<boolean>(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(9); // Saka default
  const [activeSubTab, setActiveSubTab] = useState<"stream" | "polls" | "social" | "fpl">("stream");

  // Fan social reaction feed
  const fanReactions = [
    {
      author: "@GunnersTactics",
      handle: "Arsenal Analyst",
      text: "Saka's acceleration tonight is unbelievable. 34.8 km/h peak speed recorded on the broadcast tracker! Gvardiol struggling on the turn.",
      time: "1m ago",
      likes: 342,
    },
    {
      author: "@CityZoneHQ",
      handle: "Man City Fan Hub",
      text: "Haaland needs more service from the left. Saliba and Gabriel are double-marking him whenever Kevin gets on the ball.",
      time: "3m ago",
      likes: 189,
    },
    {
      author: "@FPL_Insider",
      handle: "Fantasy Premier League",
      text: "⚡ LIVE FPL BONUS POINTS: Saka (3 pts · BPS 38), Saliba (2 pts · BPS 32), De Bruyne (1 pt · BPS 29).",
      time: "5m ago",
      likes: 852,
    },
  ];

  // Fantasy Premier League Live Standings for this match
  const fplScores = [
    { name: "Bukayo Saka", team: "ARS", pts: 8, bonus: "+3", xGI: 0.88, selectedBy: "58.4%" },
    { name: "William Saliba", team: "ARS", pts: 6, bonus: "+2", xGI: 0.12, selectedBy: "42.1%" },
    { name: "Kevin De Bruyne", team: "MCI", pts: 5, bonus: "+1", xGI: 0.74, selectedBy: "36.8%" },
    { name: "Erling Haaland", team: "MCI", pts: 5, bonus: "0", xGI: 0.95, selectedBy: "74.2%" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Top Fan Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
            <Glasses className="w-5 h-5 text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                SPECTACLE / FAN SECOND-SCREEN & AR EXPERIENCE
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800">
                FAN PORTAL · SECOND-SCREEN & AR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Apple Vision Pro & Snap Spectacles AR Glass Simulation, Live Momentum Waveform & Crowd Polls
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsArGlassMode(!isArGlassMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isArGlassMode
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                : "bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <Glasses className="w-4 h-4" />
            {isArGlassMode ? "AR Smart Glass: ON" : "Standard TV Stream"}
          </button>
        </div>
      </div>

      {/* Main Fan Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Live AR Stream & Momentum Waveform (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span className="flex items-center gap-2 text-slate-200 font-semibold">
                {isArGlassMode ? (
                  <>
                    <Glasses className="w-4 h-4 text-purple-400" />
                    <span>SPECTACLES AR GLASS 3D HUD VIEW (REAL-TIME BIOMETRIC TAGS)</span>
                  </>
                ) : (
                  <>
                    <Tv className="w-4 h-4 text-cyan-400" />
                    <span>LIVE MATCH FEED WITH TACTICAL GRAPHICS</span>
                  </>
                )}
              </span>
              <span className="text-[11px] text-purple-400 font-mono">
                {isArGlassMode ? "Holographic Spatial Overlay Active" : "Clean Broadcast Feed"}
              </span>
            </div>

            {/* Video View */}
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-black relative">
              <BroadcastCvView
                players={players}
                ball={ball}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={setSelectedPlayerId}
                showBoxes={false}
                showPitchGrid={false}
                showTrackingBadges={isArGlassMode}
                activeGraphic={activeGraphic}
                isSpectaclesMode={isArGlassMode}
                cameraAngle="main"
                isCleanFeedMode={false}
              />
            </div>

            {/* Player follow-cam selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-purple-400" /> LOCK FAN CAM:
                </span>
                {[
                  { id: 9, name: "Saka #7" },
                  { id: 8, name: "Odegaard #8" },
                  { id: 18, name: "Haaland #9" },
                  { id: 17, name: "De Bruyne #17" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayerId(p.id)}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      selectedPlayerId === p.id
                        ? "bg-purple-600 text-white"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-mono text-emerald-400">FPS: 60.0 · Latency: 12ms</span>
            </div>
          </div>

          {/* Match Momentum & Pressure Waveform Meter */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                LIVE ATTACKING MOMENTUM & CROWD PRESSURE INDEX
              </span>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">
                ARSENAL DOMINATING CURRENT PHASE (72%)
              </span>
            </div>

            {/* Pressure bars representing match minutes */}
            <div className="h-16 flex items-end gap-1.5 pt-2">
              {[
                45, 52, 60, 48, 65, 78, 85, 92, 70, 60, 55, 68, 74, 88, 95, 82, 75, 89, 94, 91,
              ].map((val, idx) => {
                const isArsenal = val >= 50;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col justify-end items-center group relative cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        isArsenal ? "bg-red-500/80 hover:bg-red-400" : "bg-sky-500/80 hover:bg-sky-400"
                      }`}
                      style={{ height: `${val}%` }}
                    />
                    <div className="hidden group-hover:block absolute -top-8 bg-slate-950 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-800 text-white whitespace-nowrap z-10">
                      {idx + 50}' : {val}% Pressure
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
              <span className="text-red-400">← 50' Second Half Restart</span>
              <span className="text-amber-400">Current: 68:20 (Arsenal Sustained Box Pressure)</span>
              <span className="text-sky-400">Man City Counter Threat →</span>
            </div>
          </div>
        </div>

        {/* Right Column: Fan Polls & FPL Fantasy League (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Interactive Live Fan Polls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Vote className="w-4 h-4 text-purple-400" />
                LIVE FAN PREDICTIONS & CROWD POLLS
              </span>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800 font-bold">
                CROWD VOTING
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {fanPolls.map((poll) => (
                <div key={poll.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-purple-400 uppercase">{poll.category}</span>
                    <span className="text-slate-500">{poll.totalVotes.toLocaleString()} votes</span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">{poll.question}</h4>

                  <div className="space-y-1.5 mt-1">
                    {poll.options.map((opt, optIdx) => {
                      const pct = Math.round((opt.votes / poll.totalVotes) * 100);
                      const isVoted = poll.userVotedIndex === optIdx;
                      return (
                        <div
                          key={optIdx}
                          onClick={() => onVotePoll(poll.id, optIdx)}
                          className={`p-2 rounded-lg border cursor-pointer relative overflow-hidden transition-all ${
                            isVoted
                              ? "bg-purple-950/40 border-purple-500/60"
                              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div
                            className="absolute top-0 bottom-0 left-0 bg-purple-600/20"
                            style={{ width: `${pct}%` }}
                          />
                          <div className="relative flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-200 flex items-center gap-1.5">
                              {isVoted && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                              {opt.label}
                            </span>
                            <span className="font-mono font-bold text-purple-300">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fantasy Football Live Bonus Points Tracker */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                LIVE FANTASY FOOTBALL (FPL) POINTS
              </span>
              <span className="text-[10px] font-mono text-emerald-400">GW28 LIVE</span>
            </div>

            <div className="space-y-1.5">
              {fplScores.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{p.team}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Ownership: {p.selectedBy} · xGI: {p.xGI}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400">{p.pts} pts</span>
                    <div className="text-[10px] font-mono font-bold text-amber-400">{p.bonus} Bonus</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fan Social Reaction Pulse */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 shadow-lg">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-400" />
              FAN SOCIAL PULSE (#ARSMCI)
            </span>
            <div className="space-y-2 mt-1">
              {fanReactions.map((r, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span className="font-bold text-cyan-400">{r.author}</span>
                    <span>{r.time}</span>
                  </div>
                  <p className="text-slate-300 leading-snug">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
