import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Award,
  DollarSign,
  Shield,
  Zap,
  Activity,
  FileText,
  Share2,
  Download,
  Copy,
  CheckCircle2,
  Users,
  Target,
  ArrowRight,
  Flame,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Printer,
  Compass,
} from "lucide-react";
import { Player, BroadcastGraphic } from "../types/match";
import {
  PLAYER_VALUATIONS,
  HEAD_TO_HEAD_MATCHUPS,
} from "../services/agentScoutingData";

interface AgentScoutHubProps {
  players: Player[];
  onTransmitToScreen?: (graphic: BroadcastGraphic) => void;
}

export const AgentScoutHub: React.FC<AgentScoutHubProps> = ({
  players,
  onTransmitToScreen,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(9); // Saka default
  const [selectedMatchupId, setSelectedMatchupId] = useState<string>("H2H-1");
  const [activeSubTab, setActiveSubTab] = useState<"radar" | "h2h" | "dossier">("radar");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedValuation =
    PLAYER_VALUATIONS[selectedPlayerId] || PLAYER_VALUATIONS[9];
  const selectedMatchup =
    HEAD_TO_HEAD_MATCHUPS.find((m) => m.id === selectedMatchupId) ||
    HEAD_TO_HEAD_MATCHUPS[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyPitch = () => {
    const text = `MATCHVISION AI AGENT REPORT — ${selectedValuation.playerName} (${selectedValuation.teamName})
Market Valuation: €${selectedValuation.marketValueEurM}M (+€${selectedValuation.valueChangeEurM}M in current match)
Agency: ${selectedValuation.agentAgency} | Contract: ${selectedValuation.contractExpiry}
Performance Tier: ${selectedValuation.performanceTier}

Key Executive Points:
${selectedValuation.keySellingPoints.map((p) => `• ${p}`).join("\n")}

Sports Science & Kinematics:
${selectedValuation.physicalSummary}

Target Champions League Clubs:
${selectedValuation.tacticalFitClubs.join(", ")}`;

    navigator.clipboard?.writeText(text);
    showToast("✓ Executive agent pitch copied to clipboard!");
  };

  const handlePrintDossier = () => {
    window.print();
  };

  const handleTransmitValuation = () => {
    if (!onTransmitToScreen) return;
    const graphic: BroadcastGraphic = {
      id: `BG-VAL-${selectedValuation.playerId}`,
      type: "player_card",
      title: `${selectedValuation.playerName.toUpperCase()} · €${selectedValuation.marketValueEurM}M`,
      subtitle: `${selectedValuation.performanceTier} · Rep: ${selectedValuation.agentAgency} (Contract: ${selectedValuation.contractExpiry})`,
      accentColor: "#06b6d4",
      badgeText: "AGENT & VALUATION SCOUT",
      isOnAir: true,
      position: "bottom",
      timestamp: "68:20",
      author: "Agent Valuation Desk",
    };
    onTransmitToScreen(graphic);
    showToast(`✓ Transmitted ${selectedValuation.playerName} valuation card to live broadcast screen!`);
  };

  // Helper for 6-axis SVG radar polygon
  const renderRadarChart = (radar: typeof selectedValuation.radar) => {
    const size = 260;
    const center = size / 2;
    const radius = 95;

    const axes = [
      { key: "progressiveThreat", label: "Threat (xT)", val: radar.progressiveThreat },
      { key: "physicalEndurance", label: "Endurance", val: radar.physicalEndurance },
      { key: "sprintExplosiveness", label: "Sprint Pace", val: radar.sprintExplosiveness },
      { key: "duelDominance", label: "Duels Won", val: radar.duelDominance },
      { key: "pressResistance", label: "Press Resist", val: radar.pressResistance },
      { key: "chanceCreation", label: "Creation", val: radar.chanceCreation },
    ];

    const angleStep = (Math.PI * 2) / axes.length;

    // Calculate polygon vertices
    const points = axes.map((axis, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (axis.val / 100) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    });

    const webLevels = [0.25, 0.5, 0.75, 1.0];

    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} className="overflow-visible">
          {/* Background concentric web polygons */}
          {webLevels.map((lvl, idx) => {
            const webPoints = axes
              .map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const r = lvl * radius;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              })
              .join(" ");

            return (
              <polygon
                key={idx}
                points={webPoints}
                fill={lvl === 1.0 ? "rgba(15, 23, 42, 0.4)" : "none"}
                stroke="rgba(148, 163, 184, 0.2)"
                strokeDasharray={lvl < 1.0 ? "2,2" : undefined}
                strokeWidth={lvl === 1.0 ? "1.5" : "1"}
              />
            );
          })}

          {/* Spokes */}
          {axes.map((axis, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="rgba(148, 163, 184, 0.2)"
                strokeWidth="1"
              />
            );
          })}

          {/* Value Polygon */}
          <polygon
            points={points.join(" ")}
            fill="rgba(6, 182, 212, 0.25)"
            stroke="#06b6d4"
            strokeWidth="2.5"
            className="transition-all duration-500"
          />

          {/* Value points & labels */}
          {axes.map((axis, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = (axis.val / 100) * radius;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);

            // Label position outside
            const labelR = radius + 22;
            const lx = center + labelR * Math.cos(angle);
            const ly = center + labelR * Math.sin(angle);

            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-mono fill-slate-300 font-medium"
                >
                  {axis.label}
                </text>
                <text
                  x={lx}
                  y={ly + 11}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[9px] font-mono font-bold fill-cyan-400"
                >
                  {axis.val}th
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 shadow-2xl relative">
      {/* Toast */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 border border-emerald-400 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-950/40">
            <DollarSign className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide">
                AGENT & SCOUTING INTELLIGENCE HUB
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                COMMERCIAL PRO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live transfer valuations, 99th percentile benchmark radars, 1v1 matchup matrix, and printable sporting director pitch sheets
            </p>
          </div>
        </div>

        {/* Global Pitch Metrics */}
        <div className="flex items-center gap-4 bg-slate-950/90 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[10px] uppercase block">Pitch Total Market Value</span>
            <span className="text-emerald-400 font-bold text-sm">€1,840,000,000</span>
          </div>
          <div className="w-px h-7 bg-slate-800" />
          <div>
            <span className="text-slate-500 text-[10px] uppercase block">Active Scouts On System</span>
            <span className="text-slate-200 font-bold text-sm">18 Club Representatives</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveSubTab("radar")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === "radar"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Player Valuation & 99th Percentile Radar
          </button>

          <button
            onClick={() => setActiveSubTab("h2h")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === "h2h"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            1v1 Head-to-Head Duel Matrix
          </button>

          <button
            onClick={() => setActiveSubTab("dossier")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === "dossier"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Executive Pitch Deck Generator
          </button>
        </div>

        {/* Player Roster Selector Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-lg scrollbar-none">
          <span className="text-[11px] font-mono text-slate-400 shrink-0">PROFILE:</span>
          {Object.values(PLAYER_VALUATIONS).map((val) => (
            <button
              key={val.playerId}
              onClick={() => setSelectedPlayerId(val.playerId)}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedPlayerId === val.playerId
                  ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span>{val.playerName}</span>
              <span className="text-[10px] text-emerald-400 font-mono">€{val.marketValueEurM}M</span>
            </button>
          ))}
        </div>
      </div>

      {/* ================= VIEW 1: RADAR & VALUATION ================= */}
      {activeSubTab === "radar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Valuation Hero Card (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    {selectedValuation.teamName} · {selectedValuation.role}
                  </span>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {selectedValuation.playerName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                    <span>Age {selectedValuation.age}</span>
                    <span>·</span>
                    <span>{selectedValuation.nationality}</span>
                    <span>·</span>
                    <span>Rep: {selectedValuation.agentAgency}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {selectedValuation.performanceTier}
                </span>
              </div>

              {/* Huge Market Value Display */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Calculated Market Valuation
                  </span>
                  <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5">
                    €{selectedValuation.marketValueEurM},000,000
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-300 mt-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+€{selectedValuation.valueChangeEurM}M surge based on today's match performance</span>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-slate-400">
                  <span className="text-[10px] uppercase block text-slate-500">Contract Expiry</span>
                  <span className="font-bold text-slate-200">{selectedValuation.contractExpiry}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={handleTransmitValuation}
                  className="px-3 py-2 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Transmit Card to Broadcast
                </button>
                <button
                  onClick={handleCopyPitch}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Pitch Brief
                </button>
              </div>
            </div>

            {/* Tactical Fit & Suitor Clubs */}
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                Champions League Suitor Club Compatibility
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedValuation.tacticalFitClubs.map((club, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1.5"
                  >
                    <Shield className="w-3 h-3 text-cyan-400" />
                    {club}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: 6-Axis Percentile Radar & Selling Points (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  6-Pillar European Benchmark Radar (99th Percentile Normalized)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Data Grounded in Opta & Tracked Kinematics
                </span>
              </div>

              {/* Radar Graphic */}
              <div className="py-2 flex justify-center">
                {renderRadarChart(selectedValuation.radar)}
              </div>

              {/* Executive Selling Points */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                  Verified Executive Selling Points (For Sporting Directors)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedValuation.keySellingPoints.map((pt, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-200 leading-relaxed flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Summary */}
              <div className="mt-3 p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-200">
                <span className="font-bold font-mono uppercase text-[10px] block mb-1 text-indigo-300">
                  Sports Science Physical & Durability Summary
                </span>
                {selectedValuation.physicalSummary}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: 1v1 HEAD-TO-HEAD BATTLE ARENA ================= */}
      {activeSubTab === "h2h" && (
        <div className="flex flex-col gap-4">
          {/* Matchup Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400">SELECT DUEL:</span>
            {HEAD_TO_HEAD_MATCHUPS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMatchupId(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  selectedMatchupId === m.id
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <span>{m.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({m.category})</span>
              </button>
            ))}
          </div>

          {/* Duel Comparison Card */}
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-100">{selectedMatchup.playerAName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                  {selectedMatchup.playerATeam}
                </span>
              </div>

              <div className="px-3 py-1 rounded-full bg-slate-800 text-[11px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                VS · 1v1 SPATIAL COLLISION
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                  {selectedMatchup.playerBTeam}
                </span>
                <span className="text-sm font-bold text-slate-100">{selectedMatchup.playerBName}</span>
              </div>
            </div>

            {/* Side-by-side metric comparison rows */}
            <div className="space-y-3 max-w-3xl mx-auto">
              {selectedMatchup.statComparisons.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 items-center bg-slate-900/70 p-3 rounded-lg border border-slate-800/80 text-xs font-mono"
                >
                  <div
                    className={`col-span-4 font-bold text-sm ${
                      row.advantage === "A" ? "text-emerald-400 font-extrabold" : "text-slate-200"
                    }`}
                  >
                    {row.valA} {row.advantage === "A" && "★"}
                  </div>
                  <div className="col-span-4 text-center text-slate-400 uppercase text-[11px]">
                    {row.label}
                  </div>
                  <div
                    className={`col-span-4 text-right font-bold text-sm ${
                      row.advantage === "B" ? "text-emerald-400 font-extrabold" : "text-slate-200"
                    }`}
                  >
                    {row.advantage === "B" && "★ "} {row.valB}
                  </div>
                </div>
              ))}
            </div>

            {/* Tactical Verdict Callout */}
            <div className="mt-5 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed max-w-3xl mx-auto">
              <span className="font-bold text-indigo-400 font-mono uppercase text-[11px] block mb-1">
                Computer Vision Tactical & Spatial Duel Verdict:
              </span>
              {selectedMatchup.tacticalVerdict}
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: EXECUTIVE PITCH DECK GENERATOR ================= */}
      {activeSubTab === "dossier" && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 flex flex-col gap-5 text-slate-100">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block">
                OFFICIAL SCOUTING & AGENT TRANSFER DOSSIER
              </span>
              <h3 className="text-xl font-black text-white mt-0.5">
                Commercial Profile: {selectedValuation.playerName}
              </h3>
              <p className="text-xs text-slate-400">
                Prepared by MatchVision AI Automated Recruitment Intelligence Suite
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintDossier}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </button>
              <button
                onClick={handleCopyPitch}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Text Brief
              </button>
            </div>
          </div>

          {/* Dossier Document Preview */}
          <div className="border border-slate-800 rounded-xl p-6 bg-slate-900/50 space-y-5 max-w-4xl mx-auto w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Current Club</span>
                <span className="font-bold text-slate-200">{selectedValuation.teamName}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Contract Status</span>
                <span className="font-bold text-slate-200">{selectedValuation.contractExpiry}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Representing Agency</span>
                <span className="font-bold text-slate-200">{selectedValuation.agentAgency}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Market Benchmark</span>
                <span className="font-bold text-emerald-400">€{selectedValuation.marketValueEurM}M</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold font-mono uppercase text-slate-400 mb-2">
                1. Executive Summary & Value Proposition
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedValuation.playerName} represents a tier-1 recruitment opportunity for clubs competing in the UEFA Champions League knockout stages. Tracking data confirms 99th percentile physical resilience, high sprint repeatability, and decisive spatial contributions in the final third.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold font-mono uppercase text-slate-400 mb-2">
                2. Key Performance Indicators & Opta Benchmarks
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {selectedValuation.keySellingPoints.map((pt, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300">
                    {pt}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold font-mono uppercase text-slate-400 mb-2">
                3. Sports Science & Biomechanical Profile
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded border border-slate-800">
                {selectedValuation.physicalSummary}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
