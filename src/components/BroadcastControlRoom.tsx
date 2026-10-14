import React, { useState, useRef, useEffect } from "react";
import {
  BroadcastGraphic,
  GraphicStyle,
  TeamStats,
  Player,
} from "../types/match";
import {
  Tv,
  Radio,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Eye,
  Sliders,
  Glasses,
  Play,
  RotateCcw,
  Zap,
  Layers,
  Trash2,
  Monitor,
  Maximize2,
  Smartphone,
  Cpu,
  Wifi,
  BatteryCharging,
  Crosshair,
  Volume2,
} from "lucide-react";

interface BroadcastControlRoomProps {
  stats: TeamStats[];
  players: Player[];
  activeGraphic: BroadcastGraphic | null;
  onUpdateGraphic: (graphic: BroadcastGraphic | null) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  suggestedGraphic?: {
    title: string;
    subtitle: string;
    type: GraphicStyle;
  };
}

export const BroadcastControlRoom: React.FC<BroadcastControlRoomProps> = ({
  stats,
  players,
  activeGraphic,
  onUpdateGraphic,
}) => {
  // Director inputs for writing what to display on the screen
  const [title, setTitle] = useState(
    activeGraphic?.title || "TACTICAL BREAKDOWN: ARSENAL HIGH PRESS"
  );
  const [subtitle, setSubtitle] = useState(
    activeGraphic?.subtitle ||
      "Defensive line compressed at 41.8m forcing Man City wide (PPDA: 8.4)"
  );
  const [badgeText, setBadgeText] = useState(
    activeGraphic?.badgeText || "SPECTACLES AR HUD"
  );
  const [graphicType, setGraphicType] = useState<GraphicStyle>(
    activeGraphic?.type || "spectacles_hud"
  );
  const [targetDevice, setTargetDevice] = useState<"spectacles" | "tv" | "all">(
    activeGraphic?.targetDevice || "spectacles"
  );
  const [accentColor, setAccentColor] = useState(
    activeGraphic?.accentColor || "#06b6d4"
  ); // Cyan default
  const [position, setPosition] = useState<"bottom" | "top" | "center" | "ticker">(
    activeGraphic?.position || "bottom"
  );
  const [tickerText, setTickerText] = useState(
    activeGraphic?.tickerText || "LIVE TRACKING: ARSENAL 1 - 1 MAN CITY (68:20) · HAALAND SPRINT 34.2 KM/H · ODEGAARD +0.64 xT"
  );
  const [spectaclesGlassTint, setSpectaclesGlassTint] = useState<string>("#06b6d4");
  const [spectaclesHudOpacity, setSpectaclesHudOpacity] = useState<number>(95);

  // Live "Hot Write" Mode: syncs inputs to on-air screen immediately on keystroke
  const [hotWriteEnabled, setHotWriteEnabled] = useState<boolean>(true);

  // Confidence preview mode: spectacles eyewear POV, TV studio monitor, or dual side-by-side
  const [confidenceViewMode, setConfidenceViewMode] = useState<"spectacles" | "tv" | "dual">(
    "spectacles"
  );

  // Gemini Multi-turn Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "m-1",
      role: "assistant",
      content:
        "Broadcast Control Room active. You are controlling the Spectacles TV screen and Television broadcast graphics. Type any headline, player stat, or tactical instruction, or ask me to draft broadcast copy.",
      model: "gemini-4-argon",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<
    "gemini-4-argon" | "gemini-3.8-flash" | "gemini-3.1-flash-lite"
  >("gemini-4-argon");
  const [directorRole, setDirectorRole] = useState<
    "director_copilot" | "graphics_producer" | "tactical_commentator"
  >("director_copilot");

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Hot-write sync: whenever user types and hot-write is enabled & currently on air, update live graphic immediately
  useEffect(() => {
    if (hotWriteEnabled && activeGraphic && activeGraphic.isOnAir) {
      onUpdateGraphic({
        ...activeGraphic,
        title,
        subtitle,
        badgeText,
        type: graphicType,
        accentColor,
        position,
        targetDevice,
        spectaclesGlassTint,
        tickerText,
      });
    }
  }, [title, subtitle, badgeText, graphicType, accentColor, position, targetDevice, spectaclesGlassTint, tickerText, hotWriteEnabled]);

  // Push custom written text live to screen
  const handlePushOnAir = (customTitle?: string, customSub?: string, customType?: GraphicStyle) => {
    const graphicToPush: BroadcastGraphic = {
      id: `BG-${Date.now()}`,
      type: customType || graphicType,
      title: (customTitle || title).trim(),
      subtitle: (customSub || subtitle).trim(),
      accentColor,
      badgeText: badgeText.trim() || (targetDevice === "spectacles" ? "SPECTACLES AR HUD" : "LIVE TACTICAL FEED"),
      isOnAir: true,
      position,
      targetDevice,
      spectaclesGlassTint,
      tickerText,
      timestamp: new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
      author: "Director Console (Spectacles TV)",
    };
    onUpdateGraphic(graphicToPush);
  };

  // Cut graphic off air (clear screen)
  const handleCutOffAir = () => {
    onUpdateGraphic(null);
  };

  // Multi-Turn Chatbot submission with full conversation history
  const handleSendChatMessage = async (presetPrompt?: string) => {
    const promptText = presetPrompt || chatInput;
    if (!promptText.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: promptText,
    };

    const updatedHistory = [...chatMessages, userMessage];
    setChatMessages(updatedHistory);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const formattedHistory = updatedHistory.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content,
      }));

      const res = await fetch("/api/broadcast-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: formattedHistory,
          model: selectedModel,
          roleType: directorRole,
        }),
      });

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Broadcast copy generated.",
        model: data.model || selectedModel,
        suggestedGraphic: data.suggestedGraphic,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);

      // If hot-write is enabled and AI suggested a graphic, load it into input fields
      if (data.suggestedGraphic) {
        setTitle(data.suggestedGraphic.title);
        setSubtitle(data.suggestedGraphic.subtitle);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Broadcast copilot error: ${err.message || "Failed to reach AI"}`,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Pre-configured Fast Director Presets targeted for TV and Spectacles
  const presets = [
    {
      label: "Ground & Aerial Duels Won",
      badge: "DUELS DOMINANCE",
      title: "ARSENAL WINNING 56% OF GROUND DUELS",
      sub: `Ground: 48/86 won (Saliba 6/8, Gabriel 7/9) · Aerial: 18/29 won (62% aerial win rate)`,
      type: "tactical_banner" as GraphicStyle,
      device: "all" as const,
      color: "#06b6d4",
    },
    {
      label: "Touches in Opponent Box",
      badge: "BOX PENETRATION",
      title: "ARSENAL DANGER ZONE: 28 BOX TOUCHES",
      sub: `Saka (8 touches in box), Havertz (6 touches in box) pinning City central defenders`,
      type: "spectacles_hud" as GraphicStyle,
      device: "spectacles" as const,
      color: "#f59e0b",
    },
    {
      label: "Rice vs Rodri Midfield Duels",
      badge: "HEAD-TO-HEAD BATTLE",
      title: "MIDFIELD DUELS: RICE 8/11 vs RODRI 8/11",
      sub: "16 contested ground duels, 21 ball recoveries combined in central third",
      type: "player_card" as GraphicStyle,
      device: "all" as const,
      color: "#8b5cf6",
    },
    {
      label: "Spectacles AR Pressing Alert",
      badge: "SPECTACLES AR HUD",
      title: "ARSENAL MID-BLOCK COMPACTNESS",
      sub: `High line held at ${stats[0]?.defLineHeightM || 41.8}m; forced 14 central turnovers`,
      type: "spectacles_hud" as GraphicStyle,
      device: "spectacles" as const,
      color: "#06b6d4",
    },
    {
      label: "Haaland Speed & xG Burst",
      badge: "PLAYER RADAR",
      title: "TOP SPRINT RECORDED: 34.2 KM/H",
      sub: "Erling Haaland (#9) direct breakaway run into left half-space corridor (xG: 0.42)",
      type: "player_card" as GraphicStyle,
      device: "all" as const,
      color: "#38bdf8",
    },
    {
      label: "VAR Offside Line Calibration",
      badge: "VAR OFFSIDE CHECK",
      title: "VAR REVIEW: TACTICAL OFFSIDE CHECK",
      sub: "Pitch homography calibrating 105m pitch plane (margin: 0.12m)",
      type: "breaking_alert" as GraphicStyle,
      device: "all" as const,
      color: "#ef4444",
    },
    {
      label: "Odegaard Half-Space xT HUD",
      badge: "TACTICAL VISION",
      title: "HALF-SPACE PASSING CORRIDOR OPEN",
      sub: "Martin Odegaard generating +0.64 xT threat between City central pivots",
      type: "spectacles_hud" as GraphicStyle,
      device: "spectacles" as const,
      color: "#8b5cf6",
    },
    {
      label: "City Overload Warning",
      badge: "TACTICAL BANNER",
      title: "MAN CITY 4v3 OVERLOAD ON LEFT FLANK",
      sub: "Grealish & Bernardo Silva pinning White; Arsenal shifting 6.4m to reinforce",
      type: "tactical_banner" as GraphicStyle,
      device: "tv" as const,
      color: "#f59e0b",
    },
    {
      label: "Live Match Ticker Stream",
      badge: "LIVE CRAWL",
      title: "ARSENAL 1 - 1 MAN CITY (68:20)",
      sub: "Ground Duels: 48 - 38 · Box Touches: 28 - 22 · Progressive Passes: 44 - 41",
      type: "live_ticker" as GraphicStyle,
      device: "all" as const,
      color: "#10b981",
    },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-[660px]">
      {/* LEFT: Broadcast Room Writing Desk & Switcher (7 cols) */}
      <div className="xl:col-span-7 flex flex-col gap-4">
        {/* Switcher Status & Device Master Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full ${
                activeGraphic?.isOnAir
                  ? "bg-red-500 animate-ping"
                  : "bg-slate-600"
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-slate-100">
                  MASTER TALLY:
                </span>
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded font-mono ${
                    activeGraphic?.isOnAir
                      ? "bg-red-600 text-white animate-pulse"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {activeGraphic?.isOnAir ? "🔴 LIVE ON AIR" : "⬛ OFF AIR (SCREEN CLEAR)"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                <span className="flex items-center gap-1 text-cyan-300">
                  <Glasses className="w-3 h-3 text-cyan-400" />
                  Controlled Screen:{" "}
                  <strong className="text-white uppercase font-sans">
                    {targetDevice === "spectacles"
                      ? "Spectacles Smart TV (AR)"
                      : targetDevice === "tv"
                      ? "Stadium TV Broadcast"
                      : "Dual Glasses & TV"}
                  </strong>
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400">LATENCY: 8ms</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePushOnAir()}
              className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-red-950/70 transition-transform active:scale-95"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              TAKE ON AIR
            </button>
            <button
              onClick={handleCutOffAir}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-2 rounded-lg text-xs transition-colors"
            >
              CUT TO BLACK
            </button>
          </div>
        </div>

        {/* Live Composer: Write What to Display on Screen */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Glasses className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  SPECTACLES TV & BROADCAST SCREEN COMPOSER
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                    DIRECTOR CONSOLE
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Write the exact text, player telemetry, and graphics appearing on smart spectacles and televisions
                </p>
              </div>
            </div>

            {/* Instant Hot Write Toggle */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <label className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hotWriteEnabled}
                  onChange={(e) => setHotWriteEnabled(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0 bg-slate-800"
                />
                <span className="font-semibold text-xs">Live Hot-Sync</span>
              </label>
              <span
                className={`w-2 h-2 rounded-full ${
                  hotWriteEnabled ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                }`}
              />
            </div>
          </div>

          {/* Target Screen Output Selector */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
              1. Destination Display Device
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: "spectacles",
                  label: "Spectacles Smart TV",
                  desc: "AR Glasses Eyewear Viewport",
                  icon: Glasses,
                },
                {
                  id: "tv",
                  label: "Television Monitor",
                  desc: "Main Broadcast SDI Feed",
                  icon: Tv,
                },
                {
                  id: "all",
                  label: "Dual Unified Output",
                  desc: "Synchronized Glasses + TV",
                  icon: Layers,
                },
              ].map((dev) => {
                const Icon = dev.icon;
                const isSelected = targetDevice === dev.id;
                return (
                  <button
                    key={dev.id}
                    onClick={() => setTargetDevice(dev.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-cyan-950/60 border-cyan-500/80 shadow-md shadow-cyan-950/50"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                    <div>
                      <div className={`text-xs font-bold ${isSelected ? "text-cyan-200" : "text-slate-300"}`}>
                        {dev.label}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        {dev.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Graphic Style Selector */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
              2. On-Screen Graphic Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { id: "spectacles_hud", label: "Spectacles AR", icon: Glasses },
                { id: "lower_third", label: "Lower Third", icon: Tv },
                { id: "tactical_banner", label: "Tactical Bar", icon: Sliders },
                { id: "breaking_alert", label: "VAR / Alert", icon: AlertTriangle },
                { id: "player_card", label: "Player Spot", icon: User },
                { id: "live_ticker", label: "Bottom Ticker", icon: Monitor },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setGraphicType(style.id as GraphicStyle)}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold text-center transition-all ${
                    graphicType === style.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Badge & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                3. Category Tag / Header Badge
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="e.g. SPECTACLES AR HUD, LIVE TACTICAL FEED, VAR CHECK"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Color Palette & Hologram Tint
              </label>
              <div className="flex items-center gap-2 pt-0.5">
                {[
                  { name: "Cyan Hologram", hex: "#06b6d4" },
                  { name: "Alert Red", hex: "#ef4444" },
                  { name: "Tactical Gold", hex: "#f59e0b" },
                  { name: "Night Emerald", hex: "#10b981" },
                  { name: "Quantum Violet", hex: "#8b5cf6" },
                  { name: "Sky Neon", hex: "#38bdf8" },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      setAccentColor(c.hex);
                      setSpectaclesGlassTint(c.hex);
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      accentColor === c.hex
                        ? "scale-110 border-white shadow-md"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Main Headline Title */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              4. Headline / Title (What Viewers Read on Screen)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter bold broadcast headline..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-bold tracking-wide focus:outline-none focus:border-cyan-500 shadow-inner"
            />
          </div>

          {/* Subtitle / Descriptive Copy */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              5. Sub-Header / Tactical Copy / Live Incident Notes
            </label>
            <textarea
              rows={2}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Enter player statistics, tactical insight, or incident description..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none font-mono"
            />
          </div>

          {/* Ticker Crawl text if ticker style */}
          {graphicType === "live_ticker" && (
            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Bottom Ticker Stream Text
              </label>
              <input
                type="text"
                value={tickerText}
                onChange={(e) => setTickerText(e.target.value)}
                placeholder="Continuous ticker crawl..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Fast Director Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Fast Tactical Presets (1-Click Load & Transmit)
              </label>
              <span className="text-[10px] font-mono text-slate-500">6 Match Incidents</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTitle(p.title);
                    setSubtitle(p.sub);
                    setBadgeText(p.badge);
                    setGraphicType(p.type);
                    setTargetDevice(p.device);
                    setAccentColor(p.color);
                    setSpectaclesGlassTint(p.color);
                    handlePushOnAir(p.title, p.sub, p.type);
                  }}
                  className="text-left bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 p-2 rounded-lg transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200 group-hover:text-cyan-300">
                    <span className="truncate">{p.label}</span>
                    <span className="text-[9px] font-mono uppercase text-slate-500 group-hover:text-cyan-400 shrink-0 ml-1">
                      PUSH ON AIR →
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live TV & Spectacles Screen Confidence Monitor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-800 mb-3 gap-2">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-400" />
              CONFIDENCE MONITOR (WHAT IS DISPLAYED ON SPECTACLES TV & MONITORS)
            </span>

            {/* Confidence Screen Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setConfidenceViewMode("spectacles")}
                className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  confidenceViewMode === "spectacles"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Glasses className="w-3 h-3" />
                Spectacles Eyewear POV
              </button>
              <button
                onClick={() => setConfidenceViewMode("tv")}
                className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  confidenceViewMode === "tv"
                    ? "bg-cyan-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Tv className="w-3 h-3" />
                Stadium TV Screen
              </button>
              <button
                onClick={() => setConfidenceViewMode("dual")}
                className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  confidenceViewMode === "dual"
                    ? "bg-indigo-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-3 h-3" />
                Dual Split
              </button>
            </div>
          </div>

          {/* SIMULATED SPECTACLES TV & BROADCAST VIEWPORT */}
          <div
            className={`relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl ${
              confidenceViewMode === "dual"
                ? "grid grid-cols-1 md:grid-cols-2 gap-2 p-2"
                : "aspect-video flex items-center justify-center p-6"
            }`}
          >
            {/* VIEW 1: SPECTACLES SMART AR GLASSES POV */}
            {(confidenceViewMode === "spectacles" || confidenceViewMode === "dual") && (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-purple-500/40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between p-4 shadow-inner">
                {/* Spectacles Eyewear Outer Frame Silhouette & Reticles */}
                <div className="absolute inset-0 pointer-events-none border-2 border-purple-500/30 rounded-lg m-1" />
                <div className="absolute inset-0 bg-radial from-transparent via-purple-950/10 to-slate-950/80 pointer-events-none" />

                {/* Top AR Smart Glasses HUD Bar */}
                <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-purple-300/80 bg-slate-950/70 backdrop-blur px-2.5 py-1 rounded-md border border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <Glasses className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    <span>SPECTACLES AR-4 PRO · 120Hz · RETINAL MicroOLED</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Wifi className="w-3 h-3" /> 8ms SYNC
                    </span>
                    <span className="flex items-center gap-1 text-cyan-300">
                      <BatteryCharging className="w-3 h-3" /> 94%
                    </span>
                  </div>
                </div>

                {/* Center Pitch Holographic Reticle */}
                <div className="relative z-10 my-auto flex flex-col items-center justify-center pointer-events-none">
                  <div className="relative w-28 h-28 border border-cyan-500/30 rounded-full flex items-center justify-center animate-spin-slow">
                    <Crosshair className="w-6 h-6 text-cyan-400/60" />
                    <span className="absolute -top-3 text-[9px] font-mono text-cyan-400/80 bg-slate-950/80 px-1 rounded">
                      HOMOGRAPHY: LOCK
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300/70 mt-1">
                    TARGET: PITCH COORDINATES (X: 14.2m, Y: -6.8m)
                  </span>
                </div>

                {/* Live AR Overlay written by the director */}
                <div className="relative z-10 w-full transition-all duration-300">
                  {activeGraphic && activeGraphic.isOnAir ? (
                    <div
                      className="bg-slate-950/92 backdrop-blur-md border rounded-xl p-3 shadow-2xl animate-in fade-in zoom-in-95"
                      style={{
                        borderColor: activeGraphic.accentColor,
                        boxShadow: `0 0 20px ${activeGraphic.accentColor}30`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Glasses className="w-3.5 h-3.5" style={{ color: activeGraphic.accentColor }} />
                          <span
                            className="text-[10px] font-mono font-extrabold tracking-widest uppercase"
                            style={{ color: activeGraphic.accentColor }}
                          >
                            {activeGraphic.badgeText || "SPECTACLES AR HUD"}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">
                          {activeGraphic.timestamp} · LIVE ON SPECTACLES
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
                        {activeGraphic.title}
                      </h4>
                      <p className="text-[11px] text-slate-200 mt-0.5 leading-snug">
                        {activeGraphic.subtitle}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-950/80 backdrop-blur border border-purple-500/30 rounded-lg p-2.5 text-center text-purple-300/60 font-mono text-[11px]">
                      SPECTACLES SCREEN IDLE · WRITE HEADLINE ABOVE & CLICK TAKE ON AIR
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: STADIUM TV BROADCAST MONITOR */}
            {(confidenceViewMode === "tv" || confidenceViewMode === "dual") && (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between p-4 shadow-inner">
                {/* Simulated Stadium Field Background Graphic */}
                <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-center">
                  <div className="w-[85%] h-[80%] border-2 border-emerald-500/50 rounded-md" />
                </div>

                {/* Top Broadcast Ticker Status */}
                <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-950/70 backdrop-blur px-2.5 py-1 rounded border border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-cyan-400" />
                    <span>MAIN STADIUM BROADCAST FEED · 1080p REC.709</span>
                  </div>
                  <span className="text-red-400 font-bold">PROGRAM SDI OUT</span>
                </div>

                {/* Live Television Graphic Display */}
                <div className="relative z-10 w-full mt-auto">
                  {activeGraphic && activeGraphic.isOnAir ? (
                    activeGraphic.type === "breaking_alert" ? (
                      <div className="bg-red-950/95 backdrop-blur-md border-l-4 border-l-red-500 border border-red-800/80 rounded-r-xl p-3 shadow-2xl">
                        <div className="flex items-center gap-2 mb-0.5">
                          <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                          <span className="text-[10px] font-mono font-black text-red-400 uppercase tracking-widest">
                            {activeGraphic.badgeText || "VAR CHECK / INCIDENT"}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-white">
                          {activeGraphic.title}
                        </h4>
                        <p className="text-[11px] text-red-200 mt-0.5">{activeGraphic.subtitle}</p>
                      </div>
                    ) : (
                      <div
                        className="backdrop-blur-md rounded-xl p-3 shadow-2xl border transition-all"
                        style={{
                          backgroundColor: "rgba(15, 23, 42, 0.94)",
                          borderLeftColor: activeGraphic.accentColor,
                          borderLeftWidth: "6px",
                          borderColor: "rgba(51, 65, 85, 0.7)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: `${activeGraphic.accentColor}25`,
                              color: activeGraphic.accentColor,
                            }}
                          >
                            {activeGraphic.badgeText || "MATCHVISION TELEVISION"}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {activeGraphic.timestamp}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                          {activeGraphic.title}
                        </h4>
                        <p className="text-[11px] text-slate-200 mt-0.5 leading-snug">
                          {activeGraphic.subtitle}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center text-slate-600 font-mono text-xs flex flex-col items-center gap-1 py-4">
                      <Tv className="w-6 h-6 opacity-40" />
                      <span>TELEVISION DISPLAY IS CLEAR</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Gemini Multi-Turn Broadcast Chatbot (5 cols) */}
      <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-[820px]">
        {/* Chatbot Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                BROADCAST AI COPILOT
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Multi-Turn Television & Spectacles Director Assistant
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              setChatMessages([
                {
                  id: "init",
                  role: "assistant",
                  content: "Chat history cleared. How can I assist with your Spectacles TV or broadcast graphics?",
                },
              ])
            }
            className="text-slate-500 hover:text-slate-300 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Model Selection Switcher */}
        <div className="py-2.5 flex items-center justify-between border-b border-slate-800/80 text-[11px]">
          <span className="text-slate-400 font-mono text-[10px] uppercase">AI Model:</span>
          <div className="flex items-center gap-1">
            {[
              { id: "gemini-4-argon", label: "4-Argon (Thinking Mode HIGH)" },
              { id: "gemini-3.8-flash", label: "3.8 Flash (General)" },
              { id: "gemini-3.1-flash-lite", label: "3.1 Lite (Fast Ticker)" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id as any)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  selectedModel === m.id
                    ? "bg-indigo-600 text-white font-bold"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                {m.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Multi-Turn Message Thread */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs scrollbar-thin scrollbar-thumb-slate-800"
        >
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-cyan-600/30 text-cyan-100 border border-cyan-500/30"
                    : "bg-slate-950/80 text-slate-200 border border-slate-800"
                }`}
              >
                {msg.model && (
                  <div className="text-[9px] font-mono text-indigo-400 mb-1 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    {msg.model}
                  </div>
                )}
                <div className="whitespace-pre-line">{msg.content}</div>

                {/* Instant "Push to Live Screen" Button for Assistant responses */}
                {msg.role === "assistant" && (
                  <button
                    onClick={() => {
                      const lines = msg.content.split("\n").filter((l) => l.trim().length > 0);
                      const customTitle =
                        lines[0]?.replace(/^#+\s*|^Title:\s*|\*+/gi, "").trim().slice(0, 48) ||
                        "MATCHVISION SPECTACLES TV";
                      const customSub =
                        lines.slice(1).join(" ").replace(/\*+/g, "").trim().slice(0, 110) ||
                        msg.content.slice(0, 90);
                      setTitle(customTitle);
                      setSubtitle(customSub);
                      handlePushOnAir(customTitle, customSub);
                    }}
                    className="mt-2.5 w-full bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Radio className="w-3 h-3 text-red-400 animate-pulse" />
                    Send this copy live to Spectacles TV & Broadcast
                  </button>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-md bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-300">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isChatLoading && (
            <div className="flex items-center gap-2 text-indigo-400 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-mono animate-pulse">
                Composing broadcast graphic with {selectedModel}...
              </span>
            </div>
          )}
        </div>

        {/* Quick Suggested Prompts for Director */}
        <div className="pt-2 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-t border-slate-800">
          {[
            "Write a Spectacles AR alert for Odegaard's passing lane",
            "Generate a lower third on Haaland's xG chance",
            "Compose a tactical warning banner on City's left flank overload",
            "Write a breaking VAR offside review graphic",
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendChatMessage(prompt)}
              className="text-[10px] whitespace-nowrap bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 px-2.5 py-1 rounded-full transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <div className="pt-2 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
            placeholder="Type instructions to draft on-screen copy for Spectacles TV..."
            disabled={isChatLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSendChatMessage()}
            disabled={isChatLoading || !chatInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
