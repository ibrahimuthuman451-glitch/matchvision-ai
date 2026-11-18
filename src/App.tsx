import React, { useState, useEffect, useRef } from "react";
import {
  INITIAL_PLAYERS,
  INITIAL_BALL,
  SAMPLE_EVENTS,
  INITIAL_TEAM_STATS,
} from "./services/matchSimulator";
import {
  Player,
  Ball,
  MatchEvent,
  TeamStats,
  TacticalOverlaysConfig,
  ViewMode,
  BroadcastGraphic,
  TelestrationAnnotation,
  TelestrationTool,
  CommercialSponsor,
} from "./types/match";
import { TacticalPitch } from "./components/TacticalPitch";
import { Link } from "./lib/router";
import {
  sampleArtefact,
  formatClock,
  type LoadedArtefact,
} from "./services/artefactAdapter";
import { BroadcastCvView } from "./components/BroadcastCvView";
import { EventTimeline } from "./components/EventTimeline";
import { PlayerInspector } from "./components/PlayerInspector";
import { TeamComparison } from "./components/TeamComparison";
import { AiTacticalAssistant } from "./components/AiTacticalAssistant";
import { CodebaseExplorer } from "./components/CodebaseExplorer";
import { ExportModal } from "./components/ExportModal";
import { BroadcastControlRoom } from "./components/BroadcastControlRoom";
import { AgentScoutHub } from "./components/AgentScoutHub";
import { CoachMatchDossier } from "./components/CoachMatchDossier";
import { TelestratorSuite } from "./components/TelestratorSuite";
import { PostMatchPunditStudio } from "./components/PostMatchPunditStudio";
import { BROADCAST_SPONSORS } from "./services/agentScoutingData";

import { BroadcastDashboard } from "./components/BroadcastDashboard";
import { CoachDashboard } from "./components/CoachDashboard";
import { PlayerDashboard } from "./components/PlayerDashboard";
import { FanDashboard } from "./components/FanDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { CoachDirective, FanPoll, UserProfile } from "./types/match";
import type { SessionUser } from "./lib/api";

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
  DollarSign,
  Compass,
  PenTool,
  Users,
  Key,
  Shield,
  Cpu,
  LogIn,
  CheckCircle2,
  Search,
} from "lucide-react";

export default function App({
  user,
  artefact = null,
}: {
  user: SessionUser;
  artefact?: LoadedArtefact | null;
}) {
  const [mode, setMode] = useState<"demo" | "artefact">(artefact ? "artefact" : "demo");
  const [players, setPlayers] = useState<Player[]>(() => (artefact ? artefact.basePlayers : INITIAL_PLAYERS));
  const [ball, setBall] = useState<Ball>(() => (artefact ? artefact.baseBall : INITIAL_BALL));
  const [events, setEvents] = useState<MatchEvent[]>(() => (artefact ? artefact.events : SAMPLE_EVENTS));
  const [stats, setStats] = useState<TeamStats[]>(() => (artefact ? artefact.stats : INITIAL_TEAM_STATS));

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentSec, setCurrentSec] = useState<number>(() => (artefact ? 0 : 4100)); // 68:20 in demo
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    () => (artefact?.basePlayers[0] ? artefact.basePlayers[0].id : 8)
  );

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

  const [viewMode, setViewMode] = useState<ViewMode>(() => (artefact ? "tactical" : "split"));
  const [activeTab, setActiveTab] = useState<
    "broadcast" | "coach" | "player" | "fan" | "admin" | "match" | "agent_hub" | "ai" | "code" | "post_match"
  >(() => (artefact ? "match" : "broadcast"));
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Authenticated workspace member (server session)
  const currentUser: UserProfile = {
    id: user.id,
    name: user.name,
    role:
      user.role === "coach"
        ? "coach"
        : user.role === "broadcaster"
        ? "broadcast"
        : user.role === "admin"
        ? "admin"
        : "analyst",
    title: `${user.role} · ${user.orgName}`,
    avatarColor:
      user.role === "coach" ? "#ef4444" : user.role === "broadcaster" ? "#38bdf8" : user.role === "admin" ? "#10b981" : "#8b5cf6",
    badge: user.role.toUpperCase(),
    email: user.email,
    accessLevel: user.isAdmin ? "SuperAdmin" : "Analyst",
    preferredDashboard:
      user.role === "coach" ? "coach" : user.role === "broadcaster" ? "broadcast" : "analyst",
  };
  const isWorkspaceAdmin = user.isAdmin;

  useEffect(() => {
    if (!isWorkspaceAdmin && (activeTab === "admin" || activeTab === "code")) {
      setActiveTab("broadcast");
    }
  }, [activeTab, isWorkspaceAdmin]);

  // Coaching Directives State (synchronized between Coach & Player)
  const [directives, setDirectives] = useState<CoachDirective[]>([
    {
      id: "DIR-INIT-1",
      targetPlayerId: 7, // Saka
      targetPlayerName: "Bukayo Saka",
      sender: "Mikel Arteta (Head Coach)",
      directiveType: "pressing",
      message: "Pin Gvardiol wide; exploit the corridor behind him during transitional turnovers.",
      timestamp: "64:10",
      status: "acknowledged",
    },
    {
      id: "DIR-INIT-2",
      targetPlayerId: 41, // Rice
      targetPlayerName: "Declan Rice",
      sender: "Mikel Arteta (Head Coach)",
      directiveType: "positional",
      message: "Drop into back 3 during build-up to isolate Haaland and establish numerical superiority.",
      timestamp: "58:30",
      status: "acknowledged",
    },
  ]);

  // Fan Second-Screen Live Polls
  const [fanPolls, setFanPolls] = useState<FanPoll[]>([
    {
      id: "POLL-1",
      question: "Who has been the Man of the Match so far?",
      options: [
        { label: "Bukayo Saka (ARS)", votes: 4820 },
        { label: "William Saliba (ARS)", votes: 3120 },
        { label: "Kevin De Bruyne (MCI)", votes: 2450 },
        { label: "Erling Haaland (MCI)", votes: 1280 },
      ],
      totalVotes: 11670,
      userVotedIndex: null,
      category: "MOTM",
    },
    {
      id: "POLL-2",
      question: "Will there be a winning goal scored before 90 minutes?",
      options: [
        { label: "Yes - Arsenal Late Winner", votes: 6240 },
        { label: "Yes - Man City Smash & Grab", votes: 3910 },
        { label: "No - Ends 1-1 Draw", votes: 2180 },
      ],
      totalVotes: 12330,
      userVotedIndex: null,
      category: "Prediction",
    },
  ]);

  const handleVotePoll = (pollId: string, optionIndex: number) => {
    setFanPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const newOptions = poll.options.map((opt, idx) =>
          idx === optionIndex ? { ...opt, votes: opt.votes + 1 } : opt
        );
        return {
          ...poll,
          options: newOptions,
          totalVotes: poll.totalVotes + 1,
          userVotedIndex: optionIndex,
        };
      })
    );
  };

  const handleAcknowledgeDirective = (id: string) => {
    setDirectives((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "acknowledged" as const } : d))
    );
  };

  // Telestrator & Broadcaster Commercial Suite state
  const [telestrationAnnotations, setTelestrationAnnotations] = useState<TelestrationAnnotation[]>([
    {
      id: "INIT-ANN-1",
      type: "spotlight",
      color: "#eab308",
      points: [{ x: 28, y: -2 }],
      radius: 4.5,
      label: "Haaland Blindside Run",
      timestamp: "68:20",
    },
    {
      id: "INIT-ANN-2",
      type: "run_vector",
      color: "#06b6d4",
      points: [
        { x: 28, y: -2 },
        { x: 42, y: 6 },
      ],
      label: "35.6 km/h Sprint",
      timestamp: "68:20",
    },
    {
      id: "INIT-ANN-3",
      type: "offside_plane",
      color: "#ef4444",
      points: [
        { x: -31.5, y: -34 },
        { x: -31.5, y: 34 },
      ],
      label: "Saliba Offside Line (41.8m)",
      timestamp: "68:20",
    },
  ]);
  const [activeTelestratorTool, setActiveTelestratorTool] = useState<TelestrationTool>("pass_arrow");
  const [activeTelestratorColor, setActiveTelestratorColor] = useState<string>("#06b6d4");
  const [selectedSponsor, setSelectedSponsor] = useState<CommercialSponsor | null>(BROADCAST_SPONSORS[0]);
  const [cameraAngle, setCameraAngle] = useState<"main" | "spidercam" | "boxcam" | "benchcam">("main");
  const [isCleanFeedMode, setIsCleanFeedMode] = useState<boolean>(false);

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
    setPiece: true,
  });

  const toggleOverlay = (key: keyof TacticalOverlaysConfig) => {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Main 60 FPS kinematic simulation loop (demo dataset only)
  useEffect(() => {
    if (!isPlaying || mode === "artefact") return;

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
  }, [isPlaying, playbackSpeed, mode]);

  // ---- Artefact replay: real tracked positions sampled from the match timeline ----
  const replayDuration = mode === "artefact" && artefact ? artefact.durationSec : 5400;

  // Switching mode swaps the whole dataset rather than recycling stale positions
  useEffect(() => {
    if (!artefact) return;
    if (mode === "artefact") {
      setPlayers(artefact.basePlayers);
      setBall(artefact.baseBall);
      setEvents(artefact.events);
      setStats(artefact.stats);
      setCurrentSec(0);
      setSelectedPlayerId(artefact.basePlayers[0]?.id ?? null);
    } else {
      setPlayers(INITIAL_PLAYERS);
      setBall(INITIAL_BALL);
      setEvents(SAMPLE_EVENTS);
      setStats(INITIAL_TEAM_STATS);
      setCurrentSec(4100);
      setSelectedPlayerId(8);
    }
    // Only react to a mode switch, not to every clock tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, artefact]);

  // Advance the replay clock
  useEffect(() => {
    if (mode !== "artefact" || !artefact || !artefact.hasTimeline || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentSec((prev) => Math.min(artefact.durationSec, prev + 0.1 * playbackSpeed));
    }, 100);
    return () => clearInterval(interval);
  }, [mode, artefact, isPlaying, playbackSpeed]);

  // Stop at the end of the timeline
  useEffect(() => {
    if (mode === "artefact" && artefact && currentSec >= artefact.durationSec - 0.05 && isPlaying) {
      setIsPlaying(false);
    }
  }, [mode, artefact, currentSec, isPlaying]);

  // Reconstruct the tracked snapshot for the current replay time
  useEffect(() => {
    if (mode !== "artefact" || !artefact || !artefact.hasTimeline) return;
    const sampled = sampleArtefact(artefact, currentSec);
    setPlayers(sampled.players);
    setBall(sampled.ball);
  }, [mode, artefact, currentSec]);

  const activateArtefactMode = () => {
    if (!artefact) return;
    setMode("artefact");
    setActiveTab("match");
    if (viewMode === "broadcast" || viewMode === "spectacles") setViewMode("tactical");
  };

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || null;

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Mode-aware header labels (demo fixture vs uploaded artefact)
  const isArtefactMode = mode === "artefact" && artefact !== null;
  const homeLabel = isArtefactMode
    ? (artefact!.meta.homeTeam || artefact!.stats[0]?.teamName || "Team A").toUpperCase()
    : "ARSENAL";
  const awayLabel = isArtefactMode
    ? (artefact!.meta.awayTeam || artefact!.stats[1]?.teamName || "Team B").toUpperCase()
    : "MAN CITY";
  const clockLabel = isArtefactMode ? formatClock(currentSec) : formatTime(currentSec);
  const phaseLabel = isArtefactMode ? "REPLAY" : "2ND HALF";
  const canReplay = isArtefactMode && Boolean(artefact?.hasTimeline);

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
              {isArtefactMode ? (
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 font-semibold"
                  title="Replaying tracked positions from the uploaded match artefact"
                >
                  ARTEFACT · {artefact?.calibration || "REPLAY"}
                </span>
              ) : (
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold"
                  title="The studio runs on a bundled sample match. Upload real pipeline artefacts in the match library."
                >
                  DEMO DATASET
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Real-Time Football Computer Vision & Spatial Intelligence Engine
            </p>
          </div>
        </div>

        {/* Live Match Header */}
        <div className="hidden lg:flex items-center gap-5 bg-slate-950/80 px-4 py-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <span className="text-xs font-bold text-slate-200">{homeLabel}</span>
            <span className="text-sm font-extrabold font-mono text-white">{isArtefactMode ? "–" : "1"}</span>
          </div>
          <div className="text-[11px] font-mono text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">
            {clockLabel} ({phaseLabel})
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold font-mono text-white">{isArtefactMode ? "–" : "1"}</span>
            <span className="text-xs font-bold text-slate-200">{awayLabel}</span>
            <span className="w-3 h-3 rounded-full bg-sky-400" />
          </div>
        </div>

        {/* Authenticated workspace member */}
        <div className="flex items-center gap-3">
          {/* Quick Auto-Search Player History Button */}
          <button
            onClick={() => setActiveTab("coach")}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold transition-all shadow-sm"
            title="Auto-search player history stats & opponent tactical intelligence"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Player History Scout</span>
          </button>

          <div
            className="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-left"
            title={`Signed in as ${currentUser.email}`}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm"
              style={{ backgroundColor: currentUser.avatarColor }}
            >
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-bold text-slate-200">{currentUser.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-extrabold uppercase bg-slate-800 text-cyan-400 border border-slate-700">
                  {currentUser.badge}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                {user.orgName} · {user.plan} plan
              </span>
            </div>
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

      {/* Role Dashboards & Primary Navigation Sub-Header */}
      <nav className="bg-slate-900/90 border-b border-slate-800 px-6 py-2 flex flex-wrap items-center justify-between gap-3 sticky top-[57px] z-30 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold mr-1">
            USER DASHBOARDS:
          </span>
          <button
            onClick={() => setActiveTab("broadcast")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
              activeTab === "broadcast"
                ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${activeGraphic?.isOnAir ? "text-red-200 animate-pulse" : ""}`} />
            Broadcast
            {activeGraphic?.isOnAir && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("coach")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
              activeTab === "coach"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Coach
          </button>
          <button
            onClick={() => setActiveTab("player")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
              activeTab === "player"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Player
          </button>
          <button
            onClick={() => setActiveTab("fan")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
              activeTab === "fan"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Glasses className="w-3.5 h-3.5" />
            Spectacle / Fan (AR)
          </button>
          {isWorkspaceAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
                activeTab === "admin"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Admin
            </button>
          )}

          <span className="h-4 w-px bg-slate-800 mx-1" />

          {/* Premier Pundit Post-Match Analysis Studio Tab */}
          <button
            onClick={() => setActiveTab("post_match")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
              activeTab === "post_match"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400/50"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-amber-400" />
            <span>Pundit Post-Match</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800/80">
              STUDIO
            </span>
          </button>

          <span className="h-4 w-px bg-slate-800 mx-1" />

          {/* Secondary Analytical Studios */}
          <button
            onClick={() => setActiveTab("match")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "match"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            Live 2D Pitch Studio
          </button>
          <button
            onClick={() => setActiveTab("agent_hub")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "agent_hub"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Agent Valuation
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "ai"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            Tactical AI
          </button>
          {isWorkspaceAdmin && (
            <button
              onClick={() => setActiveTab("code")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeTab === "code"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Python Engine
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">
            Current Portal: <span className="text-white font-bold uppercase">{activeTab}</span>
          </span>
        </div>
      </nav>

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
                {(artefact && mode === "artefact"
                  ? (["tactical"] as ViewMode[])
                  : (["split", "tactical", "broadcast", "spectacles"] as ViewMode[])
                ).map((mode) => (
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
                  { key: "setPiece", label: "Set-Pieces" },
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

            {/* Broadcaster & Coach Interactive Telestrator & Commercial Sponsor Suite */}
            <TelestratorSuite
              annotations={telestrationAnnotations}
              onAddAnnotation={(ann) => setTelestrationAnnotations((prev) => [...prev, ann])}
              onClearAnnotations={() => setTelestrationAnnotations([])}
              onUndoAnnotation={() => setTelestrationAnnotations((prev) => prev.slice(0, -1))}
              activeTool={activeTelestratorTool}
              onSelectTool={setActiveTelestratorTool}
              activeColor={activeTelestratorColor}
              onSelectColor={setActiveTelestratorColor}
              selectedSponsor={selectedSponsor}
              onSelectSponsor={setSelectedSponsor}
              isCleanFeedMode={isCleanFeedMode}
              onToggleCleanFeed={() => setIsCleanFeedMode(!isCleanFeedMode)}
              onTransmitToScreen={setActiveGraphic}
            />

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
                    <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      TOUCHLINE HOMOGRAPHY AUTO-CALIBRATION ACTIVE
                    </span>
                  </div>
                  <TacticalPitch
                    players={players}
                    ball={ball}
                    selectedPlayerId={selectedPlayerId}
                    onSelectPlayer={setSelectedPlayerId}
                    overlays={overlays}
                    telestrations={telestrationAnnotations}
                    onAddAnnotation={(ann) => setTelestrationAnnotations((prev) => [...prev, ann])}
                    onClearAnnotations={() => setTelestrationAnnotations([])}
                    onUndoAnnotation={() => setTelestrationAnnotations((prev) => prev.slice(0, -1))}
                    activeTool={activeTelestratorTool}
                    onSelectTool={setActiveTelestratorTool}
                    activeColor={activeTelestratorColor}
                    onSelectColor={setActiveTelestratorColor}
                    matchTimeSec={currentSec}
                    onAddDirective={(dir) => setDirectives((prev) => [dir, ...prev])}
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
                      onClick={() => setActiveTab("broadcast")}
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
                    sponsor={selectedSponsor}
                    cameraAngle={cameraAngle}
                    onChangeCameraAngle={setCameraAngle}
                    isCleanFeedMode={isCleanFeedMode}
                    telestrationAnnotations={telestrationAnnotations}
                  />
                </div>
              )}
            </div>

            {/* Interactive timeline & replay controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-3 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Replay source:
                  </span>
                  {artefact ? (
                    <>
                      <button
                        onClick={activateArtefactMode}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                          mode === "artefact"
                            ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                            : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        Artefact · {artefact.meta.title}
                      </button>
                      <button
                        onClick={() => setMode("demo")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                          mode === "demo"
                            ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                            : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        Demo dataset
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        Demo dataset
                      </span>
                      <Link
                        to="/app/library"
                        className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20"
                      >
                        Load a match artefact →
                      </Link>
                    </>
                  )}
                </div>

                {isArtefactMode && artefact && (
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-500">
                    <span>
                      {artefact.hasTimeline
                        ? `${artefact.sampleRateHz ?? 4} Hz · ${artefact.timeline.length} tracked samples`
                        : "No timeline samples in this artefact"}
                    </span>
                    {artefact.meta.competition && <span>{artefact.meta.competition}</span>}
                    <Link to="/app/library" className="text-cyan-300 hover:text-cyan-200">
                      Change match
                    </Link>
                  </div>
                )}
              </div>

              {isArtefactMode && artefact && !artefact.hasTimeline && (
                <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  This artefact was exported without replay samples, so the board shows the final
                  tracked snapshot. Re-export with the current engine to enable timeline replay.
                </p>
              )}

              {isArtefactMode && artefact && artefact.notes.length > 0 && (
                <ul className="text-[10px] font-mono text-slate-500 list-disc list-inside">
                  {artefact.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => (canReplay ? setIsPlaying(!isPlaying) : setIsPlaying(false))}
                    disabled={mode === "artefact" && !canReplay}
                    className="w-9 h-9 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title={canReplay ? "Play / Pause replay" : "Play / Pause"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentSec(isArtefactMode ? 0 : 4080);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title={isArtefactMode ? "Restart replay" : "Reset to 68:00"}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-sm font-bold text-slate-100 ml-2">{clockLabel}</span>
                  <span className="text-xs font-mono text-slate-500">/ {formatClock(replayDuration)}</span>
                </div>

                {/* Scrubber Slider */}
                <div className="flex-1 max-w-xl mx-4 flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500">
                    {isArtefactMode ? "0:00" : "68:00"}
                  </span>
                  <input
                    type="range"
                    min={isArtefactMode ? 0 : 4080}
                    max={isArtefactMode ? replayDuration : 4200}
                    step={0.1}
                    value={Math.min(currentSec, replayDuration)}
                    onChange={(e) => setCurrentSec(parseFloat(e.target.value))}
                    disabled={mode === "artefact" && !canReplay}
                    className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-full cursor-pointer disabled:opacity-40"
                  />
                  <span className="text-[11px] font-mono text-slate-500">{formatClock(replayDuration)}</span>
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

        {/* 1. Broadcast Director Dashboard */}
        {activeTab === "broadcast" && (
          <BroadcastDashboard
            stats={stats}
            players={players}
            ball={ball}
            activeGraphic={activeGraphic}
            onUpdateGraphic={setActiveGraphic}
            selectedSponsor={selectedSponsor}
            onSelectSponsor={setSelectedSponsor}
            cameraAngle={cameraAngle}
            onChangeCameraAngle={setCameraAngle}
            isCleanFeedMode={isCleanFeedMode}
            onToggleCleanFeed={() => setIsCleanFeedMode(!isCleanFeedMode)}
            telestrations={telestrationAnnotations}
          />
        )}

        {/* 2. Head Coach Tactical Command Dashboard */}
        {activeTab === "coach" && (
          <CoachDashboard
            stats={stats}
            players={players}
            directives={directives}
            onAddDirective={(dir) => setDirectives((prev) => [dir, ...prev])}
            onTransmitToScreen={setActiveGraphic}
          />
        )}

        {/* 3. Player Performance & Biometrics Dashboard */}
        {activeTab === "player" && (
          <PlayerDashboard
            players={players}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
            directives={directives}
            onAcknowledgeDirective={handleAcknowledgeDirective}
            onTransmitToScreen={setActiveGraphic}
          />
        )}

        {/* 4. Spectacle & Fan Second-Screen AR Dashboard */}
        {activeTab === "fan" && (
          <FanDashboard
            players={players}
            ball={ball}
            activeGraphic={activeGraphic}
            fanPolls={fanPolls}
            onVotePoll={handleVotePoll}
            onTransmitToScreen={setActiveGraphic}
          />
        )}

        {/* 5. System Administrator & CV Infrastructure Dashboard */}
        {activeTab === "admin" && isWorkspaceAdmin && (
          <AdminDashboard
            onRecalibrateHomography={() => {
              // Trigger calibration refresh
            }}
            onFlushBuffer={() => {
              // Flush video ingest buffer
            }}
          />
        )}

        {/* Secondary: Agent & Scouting Valuation Intelligence Hub */}
        {activeTab === "agent_hub" && (
          <AgentScoutHub
            players={players}
            onTransmitToScreen={setActiveGraphic}
          />
        )}

        {/* Secondary: AI Tactical Consultant with Thinking Mode & Fatigue Radar */}
        {activeTab === "ai" && (
          <AiTacticalAssistant stats={stats} players={players} />
        )}

        {/* Secondary: Python Architecture Codebase & Automated Tests */}
        {activeTab === "code" && isWorkspaceAdmin && <CodebaseExplorer />}

        {/* Premier: Post-Match Pundits & Tactical Analysts Studio */}
        {activeTab === "post_match" && (
          <PostMatchPunditStudio
            players={players}
            ball={ball}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
            onTransmitToScreen={setActiveGraphic}
            telestrations={telestrationAnnotations}
            onAddAnnotation={(ann) => setTelestrationAnnotations((prev) => [...prev, ann])}
            onClearAnnotations={() => setTelestrationAnnotations([])}
            onUndoAnnotation={() => setTelestrationAnnotations((prev) => prev.slice(0, -1))}
          />
        )}
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
