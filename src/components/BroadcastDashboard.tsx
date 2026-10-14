import React, { useState, useEffect } from "react";
import {
  Player,
  Ball,
  TeamStats,
  BroadcastGraphic,
  CommercialSponsor,
  TelestrationAnnotation,
} from "../types/match";
import { BroadcastControlRoom } from "./BroadcastControlRoom";
import { BroadcastCvView } from "./BroadcastCvView";
import { BROADCAST_SPONSORS } from "../services/agentScoutingData";
import {
  Tv,
  Radio,
  Camera,
  Layers,
  Sparkles,
  Zap,
  Shield,
  Eye,
  Sliders,
  Maximize2,
  CheckCircle2,
  Clock,
  Volume2,
  Share2,
  Flame,
  AlertTriangle,
  Monitor,
} from "lucide-react";

interface BroadcastDashboardProps {
  stats: TeamStats[];
  players: Player[];
  ball: Ball;
  activeGraphic: BroadcastGraphic | null;
  onUpdateGraphic: (graphic: BroadcastGraphic | null) => void;
  selectedSponsor: CommercialSponsor | null;
  onSelectSponsor: (sponsor: CommercialSponsor | null) => void;
  cameraAngle: "main" | "spidercam" | "boxcam" | "benchcam";
  onChangeCameraAngle: (angle: "main" | "spidercam" | "boxcam" | "benchcam") => void;
  isCleanFeedMode: boolean;
  onToggleCleanFeed: () => void;
  telestrations: TelestrationAnnotation[];
}

export const BroadcastDashboard: React.FC<BroadcastDashboardProps> = ({
  stats,
  players,
  ball,
  activeGraphic,
  onUpdateGraphic,
  selectedSponsor,
  onSelectSponsor,
  cameraAngle,
  onChangeCameraAngle,
  isCleanFeedMode,
  onToggleCleanFeed,
  telestrations,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"live_monitor" | "graphics_room" | "sponsors" | "commentary">("live_monitor");
  const [sponsorTimerSec, setSponsorTimerSec] = useState<number>(30);
  const [isSponsorLive, setIsSponsorLive] = useState<boolean>(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // Live audio commentary cues
  const commentaryCues = [
    {
      time: "68:20",
      speaker: "Lead Analyst (Gary Neville / Ally McCoist)",
      cue: "Arsenal pressing trigger: Notice Rice stepping up into Rodri's passing lane, forcing Akanji wide.",
      urgency: "HIGH",
    },
    {
      time: "67:45",
      speaker: "Stat Producer",
      cue: "Milestone Alert: Bukayo Saka has now completed 24 progressive carries today, 4 more than any other player on the pitch.",
      urgency: "MEDIUM",
    },
    {
      time: "66:10",
      speaker: "Director Cue",
      cue: "Standby for Graphic 04: Man City substitution warming up (Jack Grealish). Prepare BenchCam feed.",
      urgency: "INFO",
    },
    {
      time: "64:30",
      speaker: "Historical Context",
      cue: "Arsenal have not conceded from a set-piece at Emirates Stadium in 14 consecutive Premier League fixtures.",
      urgency: "LOW",
    },
  ];

  // Quick preset broadcast graphics
  const presetGraphics: BroadcastGraphic[] = [
    {
      id: "PRESET-1",
      type: "lower_third",
      title: "ARSENAL TACTICAL SHAPE: HIGH PRESS (PPDA 8.4)",
      subtitle: "Haaland isolated by Saliba & Gabriel dual-pivot backline",
      accentColor: "#06b6d4",
      badgeText: "PREMIER LEAGUE LIVE",
      isOnAir: true,
      position: "bottom",
      timestamp: "68:20",
      author: "Director Console",
    },
    {
      id: "PRESET-2",
      type: "tactical_banner",
      title: "KEY BATTLE: SAKA vs GVARDIOL",
      subtitle: "1v1 Take-ons: Saka 4/6 (67%) · Crosses: 7 · xT: 0.42",
      accentColor: "#ef4444",
      badgeText: "MATCHUP INTEL",
      isOnAir: true,
      position: "bottom",
      timestamp: "68:20",
      author: "Stats Engine",
    },
    {
      id: "PRESET-3",
      type: "breaking_alert",
      title: "FATIGUE ALERT: MARTIN ODEGAARD (STAMINA 42%)",
      subtitle: "Distance: 11.2 km covered · Sprint drop-off: -18% last 10 mins",
      accentColor: "#f59e0b",
      badgeText: "AI BIOMETRICS",
      isOnAir: true,
      position: "top",
      timestamp: "68:20",
      author: "Sports Science Telemetry",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Top Broadcast Master Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
            <Radio className="w-5 h-5 text-red-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                BROADCAST CONTROL SUITE & DIRECTOR CONSOLE
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                ON AIR · 1080p60 SDI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-Camera Switcher, Real-Time AR Graphics Engine, Sponsor Bug Insertion & Teleprompter
            </p>
          </div>
        </div>

        {/* View Mode Sub-tabs */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveSubTab("live_monitor")}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeSubTab === "live_monitor"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Program Monitor (PGM)
            </button>
            <button
              onClick={() => setActiveSubTab("graphics_room")}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeSubTab === "graphics_room"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Graphics Studio
            </button>
            <button
              onClick={() => setActiveSubTab("sponsors")}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeSubTab === "sponsors"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Sponsor Insertion
            </button>
            <button
              onClick={() => setActiveSubTab("commentary")}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeSubTab === "commentary"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              Commentary Cues
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeSubTab === "live_monitor" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Live Broadcast Feed (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span className="flex items-center gap-2 text-slate-200 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  PROGRAM FEED (PGM) · FEED 01 · {cameraAngle.toUpperCase()} CAM
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggleCleanFeed}
                    className={`text-[11px] px-2.5 py-0.5 rounded border transition-colors ${
                      isCleanFeedMode
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {isCleanFeedMode ? "Clean SDI Active (No UI)" : "Standard Broadcast Feed"}
                  </button>
                </div>
              </div>

              {/* Feed Screen */}
              <div className="rounded-lg overflow-hidden border border-slate-800 bg-black relative">
                <BroadcastCvView
                  players={players}
                  ball={ball}
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={setSelectedPlayerId}
                  showBoxes={!isCleanFeedMode}
                  showPitchGrid={!isCleanFeedMode}
                  showTrackingBadges={!isCleanFeedMode}
                  activeGraphic={activeGraphic}
                  isSpectaclesMode={false}
                  sponsor={isSponsorLive ? selectedSponsor : null}
                  cameraAngle={cameraAngle}
                  onChangeCameraAngle={onChangeCameraAngle}
                  isCleanFeedMode={isCleanFeedMode}
                  telestrationAnnotations={telestrations}
                />
              </div>

              {/* Camera Switcher Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-400 mr-2 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" /> CAMERA ANGLE:
                  </span>
                  {[
                    { id: "main", label: "CAM 1: Main Gantry" },
                    { id: "spidercam", label: "CAM 2: SpiderCam 105°" },
                    { id: "boxcam", label: "CAM 3: Behind Goal Box" },
                    { id: "benchcam", label: "CAM 4: Bench Tactical" },
                  ].map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => onChangeCameraAngle(cam.id as any)}
                      className={`text-xs px-2.5 py-1 rounded font-mono font-semibold transition-all ${
                        cameraAngle === cam.id
                          ? "bg-red-600 text-white shadow-sm shadow-red-900/50"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      {cam.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">EBU R95 SAFE AREA: ACTIVE</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>

            {/* Quick Graphic Triggers Row */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold font-mono">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <Zap className="w-3.5 h-3.5" /> 1-CLICK ON-AIR GRAPHIC TRIGGERS
                </span>
                <span className="text-[11px] text-slate-500">Click to instantly transmit to live broadcast</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {presetGraphics.map((pg) => {
                  const isCurrent = activeGraphic?.title === pg.title;
                  return (
                    <div
                      key={pg.id}
                      onClick={() => onUpdateGraphic(pg)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isCurrent
                          ? "bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-900/20"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                          {pg.badgeText}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-mono font-bold text-red-400 bg-red-950/60 px-1.5 py-0.2 rounded border border-red-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                            ON AIR
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{pg.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{pg.subtitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Audio Cues & On-Air Status (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {/* Active Graphic Status Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                  <Tv className="w-4 h-4 text-cyan-400" />
                  CURRENT ON-AIR GRAPHIC
                </span>
                {activeGraphic ? (
                  <button
                    onClick={() => onUpdateGraphic(null)}
                    className="text-[10px] font-mono text-red-400 hover:text-red-300 bg-red-950/50 px-2 py-0.5 rounded border border-red-800 hover:bg-red-900/60 transition-colors"
                  >
                    Kill Graphic (Off Air)
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">NO GRAPHIC</span>
                )}
              </div>

              {activeGraphic ? (
                <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/40 relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-400" />
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span className="text-cyan-400 font-bold">{activeGraphic.badgeText || "BROADCAST HUD"}</span>
                    <span>{activeGraphic.timestamp}</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white leading-snug">{activeGraphic.title}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeGraphic.subtitle}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                    <span>Target: {activeGraphic.targetDevice || "All Displays"}</span>
                    <span className="text-emerald-400 font-semibold">Broadcasting Live</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-slate-950 border border-slate-800 text-center flex flex-col items-center justify-center gap-2">
                  <Eye className="w-6 h-6 text-slate-600" />
                  <p className="text-xs text-slate-400">Clean screen feed. No overlay graphic currently on air.</p>
                  <button
                    onClick={() => onUpdateGraphic(presetGraphics[0])}
                    className="mt-1 text-xs px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
                  >
                    Air High Press Breakdown
                  </button>
                </div>
              )}
            </div>

            {/* Live Teleprompter / Audio Commentary Prompt Feed */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-purple-400" />
                  AI COMMENTARY CUE TELEPROMPTER
                </span>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800">
                  LIVE SYNC
                </span>
              </div>
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                {commentaryCues.map((cue, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-purple-400">{cue.speaker}</span>
                      <span className="text-slate-500">{cue.time}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-snug">{cue.cue}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          cue.urgency === "HIGH"
                            ? "bg-red-950 text-red-400 border border-red-800"
                            : cue.urgency === "MEDIUM"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {cue.urgency} PRIORITY
                      </span>
                      <button
                        onClick={() =>
                          onUpdateGraphic({
                            id: `CUE-GFX-${Date.now()}`,
                            type: "lower_third",
                            title: cue.speaker.toUpperCase(),
                            subtitle: cue.cue,
                            accentColor: "#a855f7",
                            badgeText: "COMMENTARY STAT",
                            isOnAir: true,
                            position: "bottom",
                            timestamp: cue.time,
                            author: "Audio Desk",
                          })
                        }
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                      >
                        Push to Lower Third →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Graphics Studio subtab */}
      {activeSubTab === "graphics_room" && (
        <BroadcastControlRoom
          stats={stats}
          players={players}
          activeGraphic={activeGraphic}
          onUpdateGraphic={onUpdateGraphic}
        />
      )}

      {/* Sponsor Insertion subtab */}
      {activeSubTab === "sponsors" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                COMMERCIAL SPONSOR BUG & LOWER-THIRD INSERTION ENGINE
              </h3>
              <p className="text-xs text-slate-400">
                Broadcast-grade digital overlay injection compliant with Premier League & UEFA TV guidelines
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSponsorLive(!isSponsorLive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                  isSponsorLive
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {isSponsorLive ? "Sponsor Bug On Air" : "Sponsor Bug Muted"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {BROADCAST_SPONSORS.map((sp) => {
              const isSelected = selectedSponsor?.id === sp.id;
              return (
                <div
                  key={sp.id}
                  onClick={() => onSelectSponsor(sp)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-950 border-amber-500 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500"
                      : "bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-xs font-extrabold font-mono px-2 py-0.5 rounded border"
                        style={{
                          color: sp.accentColor,
                          borderColor: `${sp.accentColor}40`,
                          backgroundColor: `${sp.accentColor}15`,
                        }}
                      >
                        {sp.badgeText}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> SELECTED
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-extrabold text-white">{sp.brandName}</h4>
                    <p className="text-xs text-slate-400 mt-1">{sp.tagline}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">Placement: Top-Right</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSponsor(sp);
                        onUpdateGraphic({
                          id: `SPONSOR-GFX-${Date.now()}`,
                          type: "lower_third",
                          title: `PRESENTED BY ${sp.brandName.toUpperCase()}`,
                          subtitle: sp.tagline,
                          accentColor: sp.accentColor,
                          badgeText: sp.badgeText,
                          isOnAir: true,
                          position: "bottom",
                          timestamp: "68:20",
                          author: "Commercial Sales",
                        });
                      }}
                      className="text-amber-400 hover:text-amber-300 font-semibold underline"
                    >
                      Air Lower Third →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Commentary Cues full subtab */}
      {activeSubTab === "commentary" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-400" />
                BROADCAST COMMENTARY DESK & STATISTICAL TELEPROMPTER
              </h3>
              <p className="text-xs text-slate-400">
                Live contextual feed powered by Computer Vision & Opta/Wyscout metrics for on-air commentators
              </p>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-950 px-2.5 py-1 rounded border border-purple-800">
              4 Live Teleprompter Feeds Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commentaryCues.map((cue, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-400">{cue.speaker}</span>
                  <span className="text-xs font-mono text-slate-400">{cue.time} (2ND HALF)</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">{cue.cue}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500">Urgency: {cue.urgency}</span>
                  <button
                    onClick={() =>
                      onUpdateGraphic({
                        id: `CUE-${idx}`,
                        type: "lower_third",
                        title: cue.speaker.toUpperCase(),
                        subtitle: cue.cue,
                        accentColor: "#a855f7",
                        badgeText: "COMMENTATOR INTEL",
                        isOnAir: true,
                        position: "bottom",
                        timestamp: cue.time,
                        author: "Audio Booth",
                      })
                    }
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono underline"
                  >
                    Push as On-Air Lower-Third
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
