import React, { useState } from "react";
import {
  Player,
  Ball,
  TelestrationAnnotation,
  TelestrationTool,
  AnalystPostMatchComment,
  BroadcastGraphic,
} from "../types/match";
import { SAMPLE_PUNDIT_COMMENTS, PUNDIT_PROFILES } from "../services/punditAnalysisService";
import { TacticalPitch } from "./TacticalPitch";
import {
  PenTool,
  ArrowRight,
  Minus,
  Circle,
  Square,
  Sparkles,
  Tv,
  MessageSquare,
  ThumbsUp,
  Share2,
  CheckCircle2,
  Play,
  RotateCcw,
  Trash2,
  Plus,
  Radio,
  Flame,
  Volume2,
  UserCheck,
  Target,
  Maximize2,
  Eye,
  AlertTriangle,
  Award,
} from "lucide-react";

interface PostMatchPunditStudioProps {
  players: Player[];
  ball: Ball;
  selectedPlayerId: number | null;
  onSelectPlayer: (id: number | null) => void;
  onTransmitToScreen?: (graphic: BroadcastGraphic) => void;
  telestrations: TelestrationAnnotation[];
  onAddAnnotation: (ann: TelestrationAnnotation) => void;
  onClearAnnotations: () => void;
  onUndoAnnotation: () => void;
}

export const PostMatchPunditStudio: React.FC<PostMatchPunditStudioProps> = ({
  players,
  ball,
  selectedPlayerId,
  onSelectPlayer,
  onTransmitToScreen,
  telestrations,
  onAddAnnotation,
  onClearAnnotations,
  onUndoAnnotation,
}) => {
  const [comments, setComments] = useState<AnalystPostMatchComment[]>(SAMPLE_PUNDIT_COMMENTS);
  const [selectedCommentId, setSelectedCommentId] = useState<string>("PUNDIT-CARRAGHER-1");
  const [selectedChannel, setSelectedChannel] = useState<string>("ALL");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Pundit persona
  const [activePundit, setActivePundit] = useState(PUNDIT_PROFILES[0]);

  // Drawing state inside Pundit Studio
  const [activeTool, setActiveTool] = useState<TelestrationTool>("pass_arrow");
  const [activeColor, setActiveColor] = useState<string>("#eab308");
  const [selectedPlayerForMarking, setSelectedPlayerForMarking] = useState<number | null>(null);

  // Modal for new post-match comment
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newHeadline, setNewHeadline] = useState<string>("");
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [newTakeaway, setNewTakeaway] = useState<string>("");
  const [newActionType, setNewActionType] = useState<
    "high_press" | "defensive_line_break" | "1v1_isolation" | "counter_attack" | "set_piece_delivery" | "turnover" | "box_defending"
  >("defensive_line_break");
  const [newSentiment, setNewSentiment] = useState<"critical" | "praise" | "tactical_breakdown" | "turning_point">(
    "tactical_breakdown"
  );
  const [newMinute, setNewMinute] = useState<string>("68:20 (2nd Half)");
  const [selectedPlayerIdsForComment, setSelectedPlayerIdsForComment] = useState<number[]>([9, 2]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedComment = comments.find((c) => c.id === selectedCommentId) || comments[0];

  // Load a comment's annotations onto the pitch canvas
  const handleLoadCommentAnnotations = (comment: AnalystPostMatchComment) => {
    setSelectedCommentId(comment.id);
    onClearAnnotations();
    comment.annotations.forEach((ann) => {
      onAddAnnotation({ ...ann });
    });
    showToast(`✓ Loaded ${comment.punditName}'s telestrator lines & marked players`);
  };

  // Broadcast the selected pundit analysis
  const handleBroadcastComment = (comment: AnalystPostMatchComment) => {
    if (!onTransmitToScreen) return;
    onTransmitToScreen({
      id: `BG-PUNDIT-${Date.now()}`,
      type: "tactical_banner",
      title: `${comment.punditName.toUpperCase()}: ${comment.headline.toUpperCase()}`,
      subtitle: `${comment.comment.slice(0, 110)}...`,
      accentColor: comment.sentiment === "critical" ? "#ef4444" : comment.sentiment === "praise" ? "#10b981" : "#06b6d4",
      badgeText: `${comment.channel} · POST-MATCH`,
      isOnAir: true,
      position: "bottom",
      timestamp: comment.matchMinute,
      author: comment.punditName,
    });
    showToast(`📺 Broadcast graphic transmitted: "${comment.punditName} on ${comment.headline}"`);
  };

  // Upvote a comment
  const handleLikeComment = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c))
    );
  };

  // Play audio voice simulation
  const handlePlayVoice = (comment: AnalystPostMatchComment) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${comment.punditName} analysis: ${comment.comment}`);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
      showToast(`🔊 Playing voice commentary for ${comment.punditName}`);
    } else {
      showToast(`🔊 ${comment.punditName}: "${comment.comment.slice(0, 60)}..."`);
    }
  };

  // Quick Action Point Presets for marking action on turf
  const handleAddQuickActionMarker = (
    category: "turnover" | "goal_chance" | "defensive_error" | "press_trigger" | "1v1_isolation",
    label: string,
    x: number,
    y: number
  ) => {
    const ann: TelestrationAnnotation = {
      id: `ACT-${Date.now()}`,
      type: "action_marker",
      color: category === "defensive_error" ? "#ef4444" : category === "goal_chance" ? "#10b981" : "#f59e0b",
      points: [{ x, y }],
      label,
      subLabel: `${activePundit.name} Action Point`,
      actionCategory: category,
      timestamp: "68:20",
      author: activePundit.name,
      comment: `${activePundit.name} identified ${label.toLowerCase()} at this exact position.`,
    };
    onAddAnnotation(ann);
    showToast(`✓ Marked Action: "${label}" on pitch`);
  };

  // Mark/Point a specific player with a pundit halo & note
  const handlePointPlayer = (player: Player, note?: string) => {
    const ann: TelestrationAnnotation = {
      id: `POINT-${Date.now()}-${player.id}`,
      type: "point_player",
      color: player.teamId === 0 ? "#ef4444" : "#38bdf8",
      points: [{ x: player.x, y: player.y }],
      radius: 4.8,
      label: `${player.name} (#${player.number})`,
      subLabel: note || `${activePundit.name} Spotlight`,
      targetPlayerId: player.id,
      targetPlayerName: player.name,
      timestamp: "68:20",
      author: activePundit.name,
      comment: `${activePundit.name}: Highlighting ${player.name}'s spatial influence in this phase.`,
    };
    onAddAnnotation(ann);
    onSelectPlayer(player.id);
    showToast(`✓ Pointed player: ${player.name} tagged with ${activePundit.name}'s beacon`);
  };

  // Draw line from player to action or goal
  const handleDrawPlayerPassLine = (fromPlayer: Player, toX: number, toY: number, lineLabel: string) => {
    const ann: TelestrationAnnotation = {
      id: `LINE-${Date.now()}`,
      type: "pass_arrow",
      color: activeColor,
      points: [
        { x: fromPlayer.x, y: fromPlayer.y },
        { x: toX, y: toY },
      ],
      label: lineLabel,
      timestamp: "68:20",
      author: activePundit.name,
      targetPlayerId: fromPlayer.id,
      targetPlayerName: fromPlayer.name,
    };
    onAddAnnotation(ann);
    showToast(`✓ Line drawn from ${fromPlayer.name}: "${lineLabel}"`);
  };

  // Submit new analyst comment
  const handleCreateComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadline.trim() || !newCommentText.trim()) return;

    const taggedPlayers = players.filter((p) => selectedPlayerIdsForComment.includes(p.id));

    const newComment: AnalystPostMatchComment = {
      id: `PUNDIT-USER-${Date.now()}`,
      punditName: activePundit.name,
      punditRole: activePundit.role,
      punditAvatar: activePundit.avatar,
      channel: activePundit.channel,
      matchMinute: newMinute || "FT Post-Match",
      headline: newHeadline,
      comment: newCommentText,
      keyTakeaway: newTakeaway || "Defensive and spatial discipline decide transitional phases.",
      sentiment: newSentiment,
      taggedPlayerIds: selectedPlayerIdsForComment,
      taggedPlayerNames: taggedPlayers.map((p) => p.name),
      actionType: newActionType,
      rating: 9.5,
      likes: 1,
      timestamp: newMinute || "FT",
      annotations: [...telestrations],
    };

    setComments((prev) => [newComment, ...prev]);
    setSelectedCommentId(newComment.id);
    setIsCreateModalOpen(false);
    setNewHeadline("");
    setNewCommentText("");
    setNewTakeaway("");
    showToast(`✓ Published post-match comment by ${activePundit.name} with ${telestrations.length} markings!`);
  };

  // Filtered comments
  const filteredComments = comments.filter((c) => {
    const matchChannel = selectedChannel === "ALL" || c.channel === selectedChannel;
    const matchAction = selectedActionFilter === "ALL" || c.actionType === selectedActionFilter;
    return matchChannel && matchAction;
  });

  return (
    <div className="flex flex-col gap-4 text-slate-100">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-cyan-600 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 border border-cyan-400 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                <Tv className="w-5 h-5 text-indigo-400" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                POST-MATCH PUNDITS & TACTICAL ANALYSTS STUDIO
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-700/60 font-bold uppercase">
                  TELESTRATOR V2
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
              Broadcast pundits and tactical analysts draw action lines, mark critical player movements, point to tactical events, and link in-depth post-match commentaries.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Active Pundit Selector */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <img
                src={activePundit.avatar}
                alt={activePundit.name}
                className="w-7 h-7 rounded-full object-cover border border-cyan-400/50"
              />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-slate-400 leading-none">ANALYST:</span>
                <select
                  value={activePundit.name}
                  onChange={(e) => {
                    const p = PUNDIT_PROFILES.find((pr) => pr.name === e.target.value) || PUNDIT_PROFILES[0];
                    setActivePundit(p);
                    showToast(`Active pundit switched to ${p.name} (${p.channel})`);
                  }}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  {PUNDIT_PROFILES.map((p) => (
                    <option key={p.name} value={p.name} className="bg-slate-900 text-slate-200">
                      {p.name} ({p.channel})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Write Post-Match Analysis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Pitch on Left & Post-Match Commentary Feed on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Tactical Pitch + Pundit Telestrator Drawing Deck */}
        <div className="xl:col-span-7 flex flex-col gap-3">
          {/* Telestrator Drawing Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5" /> DRAW TOOL:
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {[
                  { id: "pass_arrow", label: "Pass Arrow", icon: <ArrowRight className="w-3 h-3" /> },
                  { id: "run_vector", label: "Sprint Run", icon: <Minus className="w-3 h-3 stroke-dashed" /> },
                  { id: "point_player", label: "Point Player", icon: <Target className="w-3 h-3" /> },
                  { id: "action_marker", label: "Mark Action", icon: <Flame className="w-3 h-3" /> },
                  { id: "freehand", label: "Freehand Pen", icon: <PenTool className="w-3 h-3" /> },
                  { id: "cover_zone", label: "Cover Zone", icon: <Square className="w-3 h-3" /> },
                  { id: "offside_plane", label: "Offside Line", icon: <Minus className="w-3 h-3" /> },
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTool(tool.id as TelestrationTool);
                      showToast(`Selected tool: ${tool.label}`);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      activeTool === tool.id
                        ? "bg-cyan-600 text-white font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tool.icon}
                    <span className="hidden sm:inline">{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette & Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {[
                  { hex: "#eab308", name: "Yellow" },
                  { hex: "#06b6d4", name: "Cyan" },
                  { hex: "#ef4444", name: "Red" },
                  { hex: "#10b981", name: "Green" },
                  { hex: "#a855f7", name: "Purple" },
                  { hex: "#ffffff", name: "White" },
                ].map((col) => (
                  <button
                    key={col.hex}
                    onClick={() => setActiveColor(col.hex)}
                    style={{ backgroundColor: col.hex }}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      activeColor === col.hex ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900" : "opacity-70 hover:opacity-100"
                    }`}
                    title={col.name}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={onUndoAnnotation}
                  disabled={telestrations.length === 0}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors"
                  title="Undo last line/marker"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClearAnnotations}
                  disabled={telestrations.length === 0}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors"
                  title="Clear all lines"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Player & Action Point Shortcuts */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Quick Point Key Players */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">
                QUICK POINT PLAYER:
              </span>
              {[
                { id: 9, name: "Haaland", label: "Blindside Run" },
                { id: 7, name: "Saka", label: "1v1 Isolation" },
                { id: 2, name: "Saliba", label: "Offside Trap" },
                { id: 41, name: "Rice", label: "Press Trigger" },
                { id: 17, name: "De Bruyne", label: "Half-Space Pass" },
              ].map((qp) => {
                const ply = players.find((p) => p.id === qp.id);
                return (
                  <button
                    key={qp.id}
                    onClick={() => ply && handlePointPlayer(ply, qp.label)}
                    className="px-2 py-0.5 rounded bg-slate-950 hover:bg-indigo-900/50 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-mono flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <Target className="w-3 h-3 text-cyan-400" />
                    <span>{qp.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Action Markers */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                MARK ACTION:
              </span>
              <button
                onClick={() => handleAddQuickActionMarker("turnover", "Key Central Turnover", -6, -2)}
                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono transition-colors"
              >
                Turnover
              </button>
              <button
                onClick={() => handleAddQuickActionMarker("defensive_error", "Defensive Gap Broken", 36, 4)}
                className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-mono transition-colors"
              >
                Defensive Break
              </button>
              <button
                onClick={() => handleAddQuickActionMarker("goal_chance", "Shooting Lane (0.42 xG)", 42, 6)}
                className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono transition-colors"
              >
                Goal Chance
              </button>
            </div>
          </div>

          {/* Interactive Tactical Pitch Rendering */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
            <TacticalPitch
              players={players}
              ball={ball}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={onSelectPlayer}
              overlays={{
                voronoi: false,
                convexHulls: false,
                defensiveLines: true,
                passNetwork: false,
                pitchZones: false,
                heatmap: false,
                trails: true,
                playerBadges: true,
                speedVectors: true,
                offsideLine: true,
                setPiece: false,
              }}
              telestrations={telestrations}
              onAddAnnotation={onAddAnnotation}
              onClearAnnotations={onClearAnnotations}
              onUndoAnnotation={onUndoAnnotation}
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              activeColor={activeColor}
              onSelectColor={setActiveColor}
              matchTimeSec={4100}
            />

            {/* Active Drawing Instructions Overlay Pill */}
            <div className="absolute bottom-3 left-4 z-30 bg-slate-950/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>
                Draw Tool Active: <span className="text-cyan-400 font-bold uppercase">{activeTool.replace("_", " ")}</span>
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Click or drag on pitch to draw lines & mark players</span>
            </div>
          </div>

          {/* Attached Lines Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
            <span>
              PITCH ANNOTATIONS: <strong className="text-cyan-400">{telestrations.length}</strong> ACTIVE VECTORS & MARKERS
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                Attach Comment to Current Markings →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Pundits & Analysts Commentary Feed */}
        <div className="xl:col-span-5 flex flex-col gap-3">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-md">
            {/* Channel Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">CHANNEL:</span>
              {["ALL", "SKY SPORTS MNF", "BBC MOTD"].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                    selectedChannel === ch
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {ch === "ALL" ? "ALL CHANNELS" : ch}
                </button>
              ))}
            </div>

            {/* Action Filter */}
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="bg-slate-950 text-xs font-mono text-slate-300 px-2 py-1 rounded-lg border border-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Tactical Actions</option>
              <option value="defensive_line_break">Defensive Line Break</option>
              <option value="1v1_isolation">1v1 Channel Isolation</option>
              <option value="high_press">High-Press Trap</option>
              <option value="box_defending">Box Defending</option>
            </select>
          </div>

          {/* List of Analyst Comment Cards */}
          <div className="flex flex-col gap-3 max-h-[780px] overflow-y-auto pr-1">
            {filteredComments.map((comment) => {
              const isSelected = comment.id === selectedCommentId;
              return (
                <div
                  key={comment.id}
                  className={`border rounded-2xl p-4 transition-all shadow-lg flex flex-col gap-3 ${
                    isSelected
                      ? "bg-slate-900/95 border-cyan-500/80 shadow-cyan-950/40 ring-1 ring-cyan-500/30"
                      : "bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                  }`}
                >
                  {/* Card Header: Pundit info & Meta */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={comment.punditAvatar}
                        alt={comment.punditName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/40 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white tracking-tight">
                            {comment.punditName}
                          </h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                            {comment.channel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{comment.punditRole}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                        {comment.matchMinute}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Rating: {comment.rating?.toFixed(1) || "9.5"}/10
                      </span>
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-sm font-extrabold text-white leading-snug tracking-tight">
                    "{comment.headline}"
                  </h3>

                  {/* Comment Body */}
                  <p className="text-xs text-slate-300 leading-relaxed font-normal bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                    {comment.comment}
                  </p>

                  {/* Key Takeaway Box */}
                  <div className="bg-indigo-950/40 border-l-2 border-indigo-400 px-3 py-2 rounded-r-xl text-[11px] text-indigo-200">
                    <strong className="text-indigo-300 font-mono uppercase text-[10px] block">
                      KEY TACTICAL TAKEAWAY:
                    </strong>
                    {comment.keyTakeaway}
                  </div>

                  {/* Tagged Players & Action Category Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-500">TAGS:</span>
                      {comment.taggedPlayerNames.map((pName) => (
                        <span
                          key={pName}
                          className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-cyan-300 border border-slate-700/60"
                        >
                          @{pName}
                        </span>
                      ))}
                      <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-[10px] font-mono text-cyan-400 border border-cyan-800/60">
                        {comment.annotations.length} Markings
                      </span>
                    </div>

                    {/* Action Type Badge */}
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        comment.actionType === "defensive_line_break"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : comment.actionType === "1v1_isolation"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : comment.actionType === "high_press"
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {comment.actionType.replace("_", " ")}
                    </span>
                  </div>

                  {/* Bottom Interactive Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      {/* Load on Pitch Button */}
                      <button
                        onClick={() => handleLoadCommentAnnotations(comment)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                          isSelected
                            ? "bg-cyan-600 text-white shadow-cyan-950/40"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isSelected ? "Markings On Pitch" : "Show On Pitch"}</span>
                      </button>

                      {/* Play Voice Speech */}
                      <button
                        onClick={() => handlePlayVoice(comment)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Play audio commentary"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Broadcast to Screen */}
                      <button
                        onClick={() => handleBroadcastComment(comment)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-mono flex items-center gap-1 transition-colors"
                        title="Transmit to on-air graphic"
                      >
                        <Radio className="w-3 h-3 text-red-400 animate-pulse" />
                        <span>Broadcast</span>
                      </button>
                    </div>

                    {/* Likes Upvote */}
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors font-mono px-2 py-1 rounded hover:bg-slate-800"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{comment.likes}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Write New Post-Match Analyst Comment */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-white">
                  Add Post-Match Analyst Breakdown & Markings
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateComment} className="flex flex-col gap-4 text-xs font-sans">
              {/* Pundit Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    ANALYST PERSONA:
                  </label>
                  <select
                    value={activePundit.name}
                    onChange={(e) => {
                      const p = PUNDIT_PROFILES.find((pr) => pr.name === e.target.value) || PUNDIT_PROFILES[0];
                      setActivePundit(p);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-cyan-500 focus:outline-none"
                  >
                    {PUNDIT_PROFILES.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.channel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    MATCH MINUTE:
                  </label>
                  <input
                    type="text"
                    value={newMinute}
                    onChange={(e) => setNewMinute(e.target.value)}
                    placeholder="e.g. 68:20 (2nd Half) or FT"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Category & Sentiment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    TACTICAL ACTION CATEGORY:
                  </label>
                  <select
                    value={newActionType}
                    onChange={(e) => setNewActionType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="defensive_line_break">Defensive Line Break</option>
                    <option value="1v1_isolation">1v1 Channel Isolation</option>
                    <option value="high_press">High-Press Trap</option>
                    <option value="counter_attack">Counter-Attack Overload</option>
                    <option value="box_defending">Box Defending</option>
                    <option value="turnover">Central Turnover</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    COMMENT TONE / SENTIMENT:
                  </label>
                  <select
                    value={newSentiment}
                    onChange={(e) => setNewSentiment(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="tactical_breakdown">Tactical Breakdown</option>
                    <option value="praise">High Praise / Elite Execution</option>
                    <option value="critical">Critical Defensive Error</option>
                    <option value="turning_point">Match Turning Point</option>
                  </select>
                </div>
              </div>

              {/* Tagged Players Selector */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  TAG PLAYERS INVOLVED IN THIS ACTION:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
                  {players.slice(0, 16).map((p) => {
                    const isSelected = selectedPlayerIdsForComment.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setSelectedPlayerIdsForComment((prev) =>
                            isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          );
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          isSelected
                            ? "bg-cyan-600 text-white font-bold"
                            : "bg-slate-900 text-slate-400 hover:text-white"
                        }`}
                      >
                        {p.name} (#{p.number})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Headline */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  HEADLINE / TITLE:
                </label>
                <input
                  type="text"
                  required
                  value={newHeadline}
                  onChange={(e) => setNewHeadline(e.target.value)}
                  placeholder="e.g. Saliba Body Shape Fails To Anticipate Haaland Channel Run"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Comment text */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  POST-MATCH ANALYST COMMENTARY (DETAILED BREAKDOWN):
                </label>
                <textarea
                  required
                  rows={4}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write the full pundit breakdown explaining the movement, space exploited, player decision, or line break..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Key Takeaway */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  KEY TACTICAL TAKEAWAY:
                </label>
                <input
                  type="text"
                  value={newTakeaway}
                  onChange={(e) => setNewTakeaway(e.target.value)}
                  placeholder="e.g. Center-backs must stagger their depths against elite runners."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Attached Markings info */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>
                  Attached Drawn Lines: <strong className="text-cyan-400">{telestrations.length}</strong> markers will be saved with this comment
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Auto-saved to breakdown clip</span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold font-mono shadow-lg"
                >
                  Publish Analyst Breakdown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
