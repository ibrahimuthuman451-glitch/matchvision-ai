import React, { useState, useEffect, useRef } from "react";
import {
  INITIAL_PLAYERS,
  INITIAL_BALL,
  SAMPLE_EVENTS,
  INITIAL_TEAM_STATS,
} from "./services/matchSimulator";
import { Player, Ball, MatchEvent, TeamStats, TacticalOverlaysConfig, ViewMode, BroadcastGraphic } from "./types/match";
import { TacticalPitch } from "./components/TacticalPitch";
import { BroadcastCvView } from "./components/BroadcastCvView";
import { EventTimeline } from "./components/EventTimeline";
import { PlayerInspector } from "./components/PlayerInspector";
import { TeamComparison } from "./components/TeamComparison";
import { AiTacticalAssistant } from "./components/AiTacticalAssistant";
import { CodebaseExplorer } from "./components/CodebaseExplorer";
import { ExportModal } from "./components/ExportModal";
import { BroadcastControlRoom } from "./components/BroadcastControlRoom";

import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  SlidersHorizontal,
  Brain,
  Code,
  Download,
  Tv,
  Radio,
  Layers,
  Eye,
  Activity,
  Maximize2,
  Glasses,
} from "lucide-react";

export default function App() {
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [ball, setBall] = useState<Ball>(INITIAL_BALL);
  const [events, setEvents] = useState<MatchEvent[]>(SAMPLE_EVENTS);
  const [stats, setStats] = useState<TeamStats[]>(INITIAL_TEAM_STATS);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentSec, setCurrentSec] = useState<number>(4100); // 68:20 in seconds
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(8); // Odegaard default

  // Active On-Screen Graphic displayed on Spectacles / TV
  const [activeGraphic, setActiveGraphic] = useState<BroadcastGraphic | null>({
    id: "BG-INIT",
    type: "lower_third",
    title: "TACTICAL BREAKDOWN: ARSENAL HIGH PRESS",
    subtitle: "Defensive line compressed at 41.8m forcing Man City wide (PPDA: 8.4)",
    accentColor: "#06b6d4",
    badgeText: "TACTICAL FEED",
    isOnAir: true,
    position: "bottom",
    timestamp: "68:20",
    author: "Director Console",
  });

  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [activeTab, setActiveTab] = useState<"match" | "broadcast_room" | "ai" | "code">("match");
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Overlay HUD Toggles
  const [overlays, setOverlays] = useState<TacticalOverlaysConfig>({
    voronoi: false,
    convexHulls: true,
    defensiveLines: true,
    passNetwork: true,
    pitchZones: true,
    heatmap: false,
    trails: true,
    playerBadges: true,
    speedVectors: true,
    offsideLine: false,
  });

  const toggleOverlay = (key: keyof TacticalOverlaysConfig) => {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Main 60 FPS kinematic simulation loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSec((prev) => prev + 0.1 * playbackSpeed);

      setPlayers((prevPlayers) =>
        prevPlayers.map((p) => {
          // Subtle organic football movement (drifts, positioning shifts towards ball)
          const driftX = (Math.sin(Date.now() / 900 + p.id * 1.5) * 0.12) * playbackSpeed;
          const driftY = (Math.cos(Date.now() / 1100 + p.id * 1.8) * 0.12) * playbackSpeed;

          let newX = Math.max(-51.0, Math.min(51.0, p.x + driftX));
          let newY = Math.max(-33.0, Math.min(33.0, p.y + driftY));

          // Calculate instantaneous velocity and speed
          const vx = driftX * 10;
          const vy = driftY * 10;
          const speed = Math.sqrt(vx * vx + vy * vy) * 3.6;

          // Add to player trajectory history
          const history = [...p.history, [newX, newY] as [number, number]];
          if (history.length > 20) history.shift();

          return {
            ...p,
            x: newX,
            y: newY,
            vx,
            vy,
            speedKmh: Math.max(2.5, speed * 2.8),
            distCoveredM: p.distCoveredM + 0.25 * playbackSpeed,
            history,
          };
        })
      );

      // Ball subtle movement
      setBall((prevBall) => {
        const driftBX = (Math.sin(Date.now() / 700) * 0.25) * playbackSpeed;
        const driftBY = (Math.cos(Date.now() / 800) * 0.25) * playbackSpeed;
        return {
          ...prevBall,
          x: Math.max(-50.0, Math.min(50.0, prevBall.x + driftBX)),
          y: Math.max(-32.0, Math.min(32.0, prevBall.y + driftBY)),
          speedKmh: Math.abs(driftBX) * 120,
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || null;

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* 1. Global Navigation Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-md shadow-cyan-900/40">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                MATCHVISION <span className="text-cyan-400">AI</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                v2.4 PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Real-Time Football Computer Vision & Spatial Intelligence Engine
            </p>
          </div>
        </div>

        {/* Live Match Scoreboard */}
        <div className="hidden md:flex items-center gap-5 bg-slate-950/80 px-4 py-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <span className="text-xs font-bold text-slate-200">ARSENAL</span>
            <span className="text-sm font-extrabold font-mono text-white">1</span>
          </div>
          <div className="text-[11px] font-mono text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">
            {formatTime(currentSec)} (2ND HALF)
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold font-mono text-white">1</span>
            <span className="text-xs font-bold text-slate-200">MAN CITY</span>
            <span className="w-3 h-3 rounded-full bg-sky-400" />
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab("match")}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "match"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              Live Studio
            </button>
            <button
              onClick={() => setActiveTab("broadcast_room")}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "broadcast_room"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${activeGraphic?.isOnAir ? "text-red-300 animate-pulse" : ""}`} />
              Broadcast Room
              {activeGraphic?.isOnAir && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "ai"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              Tactical AI
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "code"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Python Engine
            </button>
          </div>

          <button
            onClick={() => setIsExportOpen(true)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Export Tracking Data JSON / CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 p-5 max-w-[1720px] w-full mx-auto flex flex-col gap-4">
        {activeTab === "match" && (
          <>
            {/* View Selector & Tactical Overlay Controls HUD */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-xl">
              {/* View Modes */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" /> VIEW:
                </span>
                {(["split", "tactical", "broadcast", "spectacles"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                      viewMode === mode
                        ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {mode === "spectacles" && <Glasses className="w-3.5 h-3.5 text-purple-400" />}
                    {mode === "split"
                      ? "Split Dual View"
                      : mode === "tactical"
                      ? "2D Tactical Pitch"
                      : mode === "broadcast"
                      ? "Broadcast CV Feed"
                      : "Spectacles AR Glass"}
                  </button>
                ))}
              </div>

              {/* Tactical Overlays Toggles */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" /> OVERLAYS:
                </span>
                {[
                  { key: "convexHulls", label: "Formations" },
                  { key: "defensiveLines", label: "Def Lines" },
                  { key: "passNetwork", label: "Pass Links" },
                  { key: "voronoi", label: "Space Control" },
                  { key: "pitchZones", label: "5 Channels" },
                  { key: "trails", label: "Trails" },
                  { key: "speedVectors", label: "Velocities" },
                  { key: "playerBadges", label: "Badges" },
                ].map(({ key, label }) => {
                  const active = overlays[key as keyof TacticalOverlaysConfig];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleOverlay(key as keyof TacticalOverlaysConfig)}
                      className={`text-[10px] px-2 py-0.5 rounded transition-all ${
                        active
                          ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40"
                          : "bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video & Tactical Pitch Grid */}
            <div
              className={`grid gap-4 ${
                viewMode === "split"
                  ? "grid-cols-1 lg:grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {/* Tactical Top-Down Pitch */}
              {(viewMode === "split" || viewMode === "tactical") && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
                    <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      TOP-DOWN 2D TACTICAL BOARD (PITCH-CALIBRATED)
                    </span>
                    <span className="text-[11px] text-cyan-400">
                      TIP: SCROLL MOUSE WHEEL OVER PITCH TO ZOOM
                    </span>
                  </div>
                  <TacticalPitch
                    players={players}
                    ball={ball}
                    selectedPlayerId={selectedPlayerId}
                    onSelectPlayer={setSelectedPlayerId}
                    overlays={overlays}
                  />
                </div>
              )}

              {/* Broadcast Camera Feed or Spectacles Smart Glass AR View */}
              {(viewMode === "split" || viewMode === "broadcast" || viewMode === "spectacles") && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
                    <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
                      {viewMode === "spectacles" ? (
                        <>
                          <Glasses className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                          <span>SPECTACLES AR SMART GLASS TV VIEW (CONTROLLED BY BROADCAST ROOM)</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                          <span>BROADCAST GANTRY CAMERA (YOLOv8 + HOMOGRAPHY PROJECTION)</span>
                        </>
                      )}
                    </span>
                    <button
                      onClick={() => setActiveTab("broadcast_room")}
                      className="text-[11px] text-red-400 hover:text-red-300 underline font-mono flex items-center gap-1"
                    >
                      <Radio className="w-3 h-3" />
                      Open Broadcast Room Switcher →
                    </button>
                  </div>
                  <BroadcastCvView
                    players={players}
                    ball={ball}
                    selectedPlayerId={selectedPlayerId}
                    onSelectPlayer={setSelectedPlayerId}
                    showBoxes={true}
                    showPitchGrid={overlays.pitchZones}
                    showTrackingBadges={overlays.playerBadges}
                    activeGraphic={activeGraphic}
                    isSpectaclesMode={viewMode === "spectacles"}
                  />
                </div>
              )}
            </div>

            {/* Interactive Timeline & Playback Controls Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-9 h-9 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors shadow-sm"
                  title="Play / Pause"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  onClick={() => setCurrentSec(4080)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Reset to 68:00"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <span className="font-mono text-sm font-bold text-slate-100 ml-2">
                  {formatTime(currentSec)}
                </span>
                <span className="text-xs font-mono text-slate-500">/ 90:00</span>
              </div>

              {/* Scrubber Slider */}
              <div className="flex-1 max-w-xl mx-4 flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-500">68:00</span>
                <input
                  type="range"
                  min={4080}
                  max={4200}
                  step={0.5}
                  value={currentSec}
                  onChange={(e) => setCurrentSec(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-full cursor-pointer"
                />
                <span className="text-[11px] font-mono text-slate-500">70:00</span>
              </div>

              {/* Playback Speed Toggles */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {[0.5, 1.0, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-xs font-mono ${
                      playbackSpeed === spd
                        ? "bg-cyan-500/20 text-cyan-300 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom 3-Column Tactical & Event Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Event Feed */}
              <div className="lg:col-span-4">
                <EventTimeline
                  events={events}
                  currentSec={currentSec}
                  onSeek={(t) => setCurrentSec(t)}
                />
              </div>

              {/* Selected Player Inspector */}
              <div className="lg:col-span-4">
                <PlayerInspector
                  player={selectedPlayer}
                  onClose={() => setSelectedPlayerId(null)}
                  onTransmitToScreen={setActiveGraphic}
                />
              </div>

              {/* Team Tactical Comparison */}
              <div className="lg:col-span-4">
                <TeamComparison
                  stats={stats}
                  onTransmitToScreen={setActiveGraphic}
                />
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Broadcast Room Director Screen Control */}
        {activeTab === "broadcast_room" && (
          <BroadcastControlRoom
            stats={stats}
            players={players}
            activeGraphic={activeGraphic}
            onUpdateGraphic={setActiveGraphic}
          />
        )}

        {/* Tab 3: AI Tactical Consultant with Thinking Mode */}
        {activeTab === "ai" && (
          <AiTacticalAssistant stats={stats} players={players} />
        )}

        {/* Tab 4: Python Architecture Codebase & Automated Tests */}
        {activeTab === "code" && <CodebaseExplorer />}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        players={players}
        ball={ball}
        events={events}
        stats={stats}
      />
    </div>
  );
}
