import React, { useState } from "react";
import {
  PenTool,
  ArrowRight,
  Circle,
  Square,
  Minus,
  RotateCcw,
  Trash2,
  Share2,
  CheckCircle2,
  Eye,
  Sliders,
  Sparkles,
  Maximize2,
  Tv,
  Bookmark,
  Layers,
} from "lucide-react";
import {
  TelestrationAnnotation,
  TelestrationTool,
  CommercialSponsor,
  BroadcastGraphic,
} from "../types/match";
import { BROADCAST_SPONSORS } from "../services/agentScoutingData";

interface TelestratorSuiteProps {
  annotations: TelestrationAnnotation[];
  onAddAnnotation: (ann: TelestrationAnnotation) => void;
  onClearAnnotations: () => void;
  onUndoAnnotation: () => void;
  activeTool: TelestrationTool;
  onSelectTool: (tool: TelestrationTool) => void;
  activeColor: string;
  onSelectColor: (color: string) => void;
  selectedSponsor: CommercialSponsor | null;
  onSelectSponsor: (sponsor: CommercialSponsor | null) => void;
  isCleanFeedMode: boolean;
  onToggleCleanFeed: () => void;
  onTransmitToScreen?: (graphic: BroadcastGraphic) => void;
}

export const TelestratorSuite: React.FC<TelestratorSuiteProps> = ({
  annotations,
  onAddAnnotation,
  onClearAnnotations,
  onUndoAnnotation,
  activeTool,
  onSelectTool,
  activeColor,
  onSelectColor,
  selectedSponsor,
  onSelectSponsor,
  isCleanFeedMode,
  onToggleCleanFeed,
  onTransmitToScreen,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const colors = [
    { name: "Cyan", hex: "#06b6d4" },
    { name: "Yellow", hex: "#eab308" },
    { name: "Red", hex: "#ef4444" },
    { name: "White", hex: "#ffffff" },
    { name: "Green", hex: "#10b981" },
  ];

  const tools: { id: TelestrationTool; label: string; icon: React.ReactNode }[] = [
    { id: "pass_arrow", label: "Pass Arrow", icon: <ArrowRight className="w-3.5 h-3.5" /> },
    { id: "run_vector", label: "Sprint Run", icon: <Minus className="w-3.5 h-3.5 stroke-dashed" /> },
    { id: "spotlight", label: "Player Spotlight", icon: <Circle className="w-3.5 h-3.5" /> },
    { id: "cover_zone", label: "Cover Shadow", icon: <Square className="w-3.5 h-3.5" /> },
    { id: "offside_plane", label: "Offside Line", icon: <Minus className="w-3.5 h-3.5" /> },
    { id: "freehand", label: "Freehand Pen", icon: <PenTool className="w-3.5 h-3.5" /> },
  ];

  // Quick telestrator tactical presets for broadcasters
  const handleApplyPreset = (presetType: "haaland_run" | "saka_1v1" | "rest_defense" | "offside_trap") => {
    onClearAnnotations();

    if (presetType === "haaland_run") {
      onAddAnnotation({
        id: `ann-${Date.now()}-1`,
        type: "spotlight",
        color: "#eab308",
        points: [{ x: 28, y: -2 }],
        radius: 4.5,
        label: "Haaland Blindside",
        timestamp: "68:20",
      });
      onAddAnnotation({
        id: `ann-${Date.now()}-2`,
        type: "run_vector",
        color: "#06b6d4",
        points: [
          { x: 28, y: -2 },
          { x: 42, y: 6 },
        ],
        label: "35.6 km/h Sprint",
        timestamp: "68:20",
      });
      showToast("✓ Applied 'Haaland Blindside Run' telestration preset");
    } else if (presetType === "saka_1v1") {
      onAddAnnotation({
        id: `ann-${Date.now()}-1`,
        type: "spotlight",
        color: "#ef4444",
        points: [{ x: 18, y: -24 }],
        radius: 4.5,
        label: "Saka Isolation",
        timestamp: "68:20",
      });
      onAddAnnotation({
        id: `ann-${Date.now()}-2`,
        type: "pass_arrow",
        color: "#10b981",
        points: [
          { x: 18, y: -24 },
          { x: 38, y: -12 },
        ],
        label: "Inside Cut & Strike",
        timestamp: "68:20",
      });
      showToast("✓ Applied 'Saka 1v1 Isolation' telestration preset");
    } else if (presetType === "rest_defense") {
      onAddAnnotation({
        id: `ann-${Date.now()}-1`,
        type: "cover_zone",
        color: "#06b6d4",
        points: [{ x: -28, y: -18 }],
        width: 32,
        height: 36,
        label: "3+2 Rest Defense Cage",
        timestamp: "68:20",
      });
      showToast("✓ Applied '3+2 Rest Defense Cage' telestration preset");
    } else if (presetType === "offside_trap") {
      onAddAnnotation({
        id: `ann-${Date.now()}-1`,
        type: "offside_plane",
        color: "#ef4444",
        points: [
          { x: -31.5, y: -34 },
          { x: -31.5, y: 34 },
        ],
        label: "Saliba Offside Line (41.8m)",
        timestamp: "68:20",
      });
      showToast("✓ Applied 'Offside Line (41.8m)' telestration preset");
    }
  };

  const handleTransmitTelestration = () => {
    if (!onTransmitToScreen) return;
    onTransmitToScreen({
      id: `BG-TELE-${Date.now()}`,
      type: "tactical_banner",
      title: "TELESTRATOR ANALYSIS: SPATIAL OVERLOAD",
      subtitle: `${annotations.length} tactical vectors drawn · Highlighting key player channel runs & offside trap`,
      accentColor: activeColor,
      badgeText: "TELESTRATOR ON-AIR",
      isOnAir: true,
      position: "bottom",
      timestamp: "68:20",
      author: "Pundit / Video Analyst",
    });
    showToast("✓ Transmitted telestrator graphic to on-air broadcast!");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-3 shadow-md relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-xl flex items-center gap-2 border border-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Telestrator Tools */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
            <PenTool className="w-3.5 h-3.5 text-cyan-400" /> TELESTRATOR:
          </span>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTool(t.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTool === t.id
                    ? "bg-cyan-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={t.label}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 ml-1">
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={() => onSelectColor(c.hex)}
                style={{ backgroundColor: c.hex }}
                className={`w-5 h-5 rounded-full transition-transform ${
                  activeColor === c.hex ? "scale-115 ring-2 ring-white ring-offset-1 ring-offset-slate-900" : "opacity-75 hover:opacity-100"
                }`}
                title={c.name}
              />
            ))}
          </div>

          {/* Undo & Clear */}
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={onUndoAnnotation}
              disabled={annotations.length === 0}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
              title="Undo Last Annotation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClearAnnotations}
              disabled={annotations.length === 0}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
              title="Clear All Annotations"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Commercial Sponsor Placement & Clean Feed Mode */}
        <div className="flex items-center gap-2">
          {/* Sponsor Selector Dropdown */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">SPONSOR:</span>
            <select
              value={selectedSponsor?.id || "none"}
              onChange={(e) => {
                const sp = BROADCAST_SPONSORS.find((s) => s.id === e.target.value) || null;
                onSelectSponsor(sp);
                showToast(sp ? `Sponsor set: ${sp.brandName}` : "Sponsor banner cleared");
              }}
              className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
            >
              <option value="none">No Sponsor Overlay</option>
              {BROADCAST_SPONSORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.brandName} ({s.badgeText})
                </option>
              ))}
            </select>
          </div>

          {/* Clean Graphic Feed Switcher */}
          <button
            onClick={onToggleCleanFeed}
            className={`px-3 py-1 text-xs rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              isCleanFeedMode
                ? "bg-red-600 text-white animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
            title="Toggle Clean SDI Video Feed for Production Switchers"
          >
            <Tv className="w-3.5 h-3.5" />
            {isCleanFeedMode ? "CLEAN SDI ON" : "Clean SDI Mode"}
          </button>

          {/* Transmit Telestration to Screen */}
          <button
            onClick={handleTransmitTelestration}
            className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            Broadcast Telestration
          </button>
        </div>
      </div>

      {/* Bottom Presets Row */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 overflow-x-auto scrollbar-none text-xs">
        <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">
          PUNDIT QUICK PRESETS:
        </span>
        <button
          onClick={() => handleApplyPreset("haaland_run")}
          className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] whitespace-nowrap"
        >
          Haaland Blindside Sprint (35.6 km/h)
        </button>
        <button
          onClick={() => handleApplyPreset("saka_1v1")}
          className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] whitespace-nowrap"
        >
          Saka 1v1 Channel Isolation
        </button>
        <button
          onClick={() => handleApplyPreset("rest_defense")}
          className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] whitespace-nowrap"
        >
          Arsenal 3+2 Rest Defense Cage
        </button>
        <button
          onClick={() => handleApplyPreset("offside_trap")}
          className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] whitespace-nowrap"
        >
          Saliba Offside Trap Line (41.8m)
        </button>
      </div>
    </div>
  );
};
