import React, { useState, useMemo } from "react";
import {
  PlayerHistoricalProfile,
  Player,
  BroadcastGraphic,
  CoachDirective,
} from "../types/match";
import {
  searchPlayerHistory,
  getPlayerHistoricalProfile,
  getOpponentKeyThreats,
  HISTORICAL_PLAYERS_DB,
} from "../services/playerHistoryService";
import {
  Search,
  Shield,
  Target,
  Flame,
  Zap,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Send,
  Compass,
  ArrowRight,
  Printer,
  Copy,
  Radio,
  Sliders,
  Sparkles,
  Users,
  Clock,
  Layers,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";

interface PlayerHistoryAnalyticsProps {
  players: Player[];
  onAddDirective?: (directive: CoachDirective) => void;
  onTransmitToScreen?: (graphic: BroadcastGraphic) => void;
  initialSelectedPlayerId?: number;
}

export const PlayerHistoryAnalytics: React.FC<PlayerHistoryAnalyticsProps> = ({
  players,
  onAddDirective,
  onTransmitToScreen,
  initialSelectedPlayerId = 14, // Default to Haaland (top opponent threat) or Saka
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<"all" | "arsenal" | "mancity">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(initialSelectedPlayerId);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Perform auto-search with filtering
  const searchResults = useMemo(() => {
    return searchPlayerHistory(searchQuery, {
      filterTeam: teamFilter,
      filterRole: roleFilter,
    });
  }, [searchQuery, teamFilter, roleFilter]);

  // Selected player profile
  const activeProfile: PlayerHistoricalProfile = useMemo(() => {
    const found = getPlayerHistoricalProfile(selectedPlayerId);
    if (found) return found;
    return searchResults[0] || HISTORICAL_PLAYERS_DB[14];
  }, [selectedPlayerId, searchResults]);

  // Opponent high threats
  const opponentThreats = useMemo(() => getOpponentKeyThreats(), []);

  // Dispatch tactical directive directly to coach system
  const handleDispatchDirective = () => {
    if (!onAddDirective || !activeProfile) return;

    const newDirective: CoachDirective = {
      id: `DIR-HIST-${Date.now()}`,
      targetPlayerId: activeProfile.id,
      targetPlayerName: activeProfile.name,
      sender: "Coach Mikel Arteta",
      directiveType: activeProfile.recommendedCoachDirective.directiveType,
      message: `[TACTICAL EXPLOIT vs ${activeProfile.name}] ${activeProfile.recommendedCoachDirective.message}`,
      timestamp: "68:30",
      status: "acknowledged",
    };

    onAddDirective(newDirective);
    showToast(`✓ Tactical countermeasure dispatched to squad against ${activeProfile.name}!`);
  };

  // Transmit historical head-to-head card to broadcast screen
  const handleTransmitToBroadcast = () => {
    if (!onTransmitToScreen || !activeProfile) return;

    const graphic: BroadcastGraphic = {
      id: `BG-HIST-${activeProfile.id}-${Date.now()}`,
      type: "player_card",
      title: `${activeProfile.name.toUpperCase()} · CAREER vs ${activeProfile.headToHead.opponentTeam.toUpperCase()}`,
      subtitle: `${activeProfile.headToHead.careerMatches} Matches · ${activeProfile.headToHead.goalsScored} Goals · ${activeProfile.headToHead.assists} Ast · ${activeProfile.headToHead.directOpponentMatchup}`,
      accentColor: activeProfile.team === "Arsenal" ? "#ef4444" : "#0ea5e9",
      badgeText: "HISTORICAL HEAD-TO-HEAD",
      isOnAir: true,
      position: "bottom",
      timestamp: "68:30",
      author: "Tactical Historical Analytics",
    };

    onTransmitToScreen(graphic);
    showToast(`✓ Sent historical comparison card for ${activeProfile.name} to live broadcast overlay!`);
  };

  const handleCopyAnalysis = () => {
    if (!activeProfile) return;
    const text = `MATCHVISION AI COACH TACTICAL DOSSIER — ${activeProfile.fullName} (${activeProfile.team})
Position: ${activeProfile.positionDetail} | Shirt #${activeProfile.shirtNumber} | Foot: ${activeProfile.preferredFoot}
Career vs ${activeProfile.headToHead.opponentTeam}: ${activeProfile.headToHead.careerMatches} GP, ${activeProfile.headToHead.goalsScored} G, ${activeProfile.headToHead.assists} A
Historical Threat Index: ${activeProfile.headToHead.historicalThreatScore}/100
Direct Matchup: ${activeProfile.headToHead.directOpponentMatchup} (${activeProfile.headToHead.directMatchupSuccessPct}% duel rate)

Coach Countermeasure & Press Trigger:
${activeProfile.recommendedCoachDirective.message}

Identified Exploitable Vulnerabilities:
${activeProfile.vulnerabilities.map((v) => `• [${v.area.toUpperCase()}] ${v.coachExploitAdvice}`).join("\n")}
`;

    navigator.clipboard?.writeText(text);
    showToast("✓ Copied tactical player analysis to clipboard!");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-6 shadow-2xl relative text-slate-100">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-emerald-400 backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-950/40">
            <Search className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide">
                AUTOMATED PLAYER HISTORICAL STATS & OPPONENT INTELLIGENCE
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AUTO-RETRIEVAL ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Instant multi-season records, head-to-head match histories, pressing vulnerabilities, and coach tactical countermeasure playbooks
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAnalysis}
            className="px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Copy Analysis"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Brief</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Dossier</span>
          </button>
        </div>
      </div>

      {/* Auto-Search & Instant Filter Bar */}
      <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Search Input */}
          <div className="flex-1 min-w-[260px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Auto-search by player name, shirt #, team, press trigger, foot, or tactical threat (e.g., 'Haaland', 'Saka', 'Right foot', 'Key threat')..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Team Filter */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setTeamFilter("all")}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                teamFilter === "all" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              All Teams
            </button>
            <button
              onClick={() => setTeamFilter("arsenal")}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all flex items-center gap-1 ${
                teamFilter === "arsenal" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Arsenal (Our Squad)
            </button>
            <button
              onClick={() => setTeamFilter("mancity")}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all flex items-center gap-1 ${
                teamFilter === "mancity" ? "bg-sky-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
              Man City (Opponent)
            </button>
          </div>

          {/* Position Role Filter */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {["all", "ATT", "MID", "DEF"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2 py-1 text-xs rounded-md font-mono font-semibold transition-all ${
                  roleFilter === r ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-mono">
          <span className="text-slate-500 flex items-center gap-1 shrink-0">
            <Flame className="w-3 h-3 text-amber-500" />
            POPULAR COACH SEARCHES:
          </span>
          {[
            { label: "Erling Haaland (Target #1)", id: 14 },
            { label: "Bukayo Saka (#7)", id: 7 },
            { label: "Kevin De Bruyne (Playmaker)", id: 17 },
            { label: "William Saliba (Duel Master)", id: 3 },
            { label: "Rodri (Pivot Control)", id: 16 },
            { label: "Phil Foden (#47)", id: 18 },
            { label: "Josko Gvardiol (Overlap)", id: 15 },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => {
                setSelectedPlayerId(chip.id);
                setSearchQuery("");
              }}
              className={`px-2.5 py-1 rounded-md border transition-all shrink-0 flex items-center gap-1 ${
                selectedPlayerId === chip.id
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
              }`}
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Analysis Grid: Left List (Results), Right Dossier (In-depth Stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Player Search Matches (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>RESULTS ({searchResults.length} PLAYERS)</span>
            <span>CLICK TO AUTO-ANALYZE</span>
          </div>

          <div className="flex flex-col gap-2 max-h-[640px] overflow-y-auto pr-1">
            {searchResults.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-500">
                No matching players found for &quot;{searchQuery}&quot;. Try searching &apos;Haaland&apos;, &apos;Saka&apos;, or &apos;ATT&apos;.
              </div>
            ) : (
              searchResults.map((p) => {
                const isSelected = p.id === activeProfile.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPlayerId(p.id);
                      setSelectedSeasonIndex(0);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-slate-800/90 border-amber-500/80 shadow-lg shadow-amber-950/20"
                        : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs font-mono shadow-md ${
                          p.team === "Arsenal"
                            ? "bg-red-600 text-white"
                            : "bg-sky-500 text-slate-950"
                        }`}
                      >
                        #{p.shirtNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-white">
                            {p.name}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              p.isOpponent
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {p.isOpponent ? "OPPONENT" : "OUR SQUAD"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {p.positionDetail} · {p.team}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-mono text-amber-400 font-bold">
                        {p.headToHead.historicalThreatScore} THREAT
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {p.headToHead.careerMatches} H2H Matches
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Threat Alert Box */}
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>HIGH-THREAT OPPONENT RADAR</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Opponent attackers averaging &gt;0.80 xG/90 against Arsenal defensive setups.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {opponentThreats.slice(0, 3).map((threat) => (
                <button
                  key={threat.id}
                  onClick={() => setSelectedPlayerId(threat.id)}
                  className="px-2 py-1 text-[11px] font-mono rounded bg-red-900/40 text-red-200 border border-red-700/50 hover:bg-red-800/50 flex items-center gap-1 transition-colors"
                >
                  <span>{threat.name}</span>
                  <span className="text-[9px] text-red-400 font-bold">
                    ({threat.headToHead.goalsScored} G)
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: In-Depth Player History & Coach Dossier (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Executive Player Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl font-mono shadow-xl border-2 ${
                  activeProfile.team === "Arsenal"
                    ? "bg-red-600/90 text-white border-red-500/60 shadow-red-950/50"
                    : "bg-sky-500 text-slate-950 border-sky-400/60 shadow-sky-950/50"
                }`}
              >
                #{activeProfile.shirtNumber}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">
                    {activeProfile.fullName}
                  </h3>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      activeProfile.team === "Arsenal"
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    }`}
                  >
                    {activeProfile.team.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>{activeProfile.positionDetail}</span>
                  <span>•</span>
                  <span>{activeProfile.nationality} ({activeProfile.age} yrs, {activeProfile.heightCm} cm)</span>
                  <span>•</span>
                  <span>Preferred: <strong className="text-white">{activeProfile.preferredFoot} Foot</strong></span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold font-mono">
                    €{activeProfile.marketValueEurM}M Valuation
                  </span>
                </div>
              </div>
            </div>

            {/* Coach Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDispatchDirective}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40 flex items-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Tactical Directive</span>
              </button>
              <button
                onClick={handleTransmitToBroadcast}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 flex items-center gap-1.5 transition-all"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Broadcast Graphic</span>
              </button>
            </div>
          </div>

          {/* Key Tactical Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400">PRESS RESISTANCE</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-extrabold text-amber-400 font-mono">
                  {activeProfile.pressResistanceScore}%
                </span>
                <span className="text-[10px] text-slate-500">Top Tier</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${activeProfile.pressResistanceScore}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400">HISTORICAL THREAT</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-extrabold text-red-400 font-mono">
                  {activeProfile.headToHead.historicalThreatScore}/100
                </span>
                <span className="text-[10px] text-slate-500">High Alert</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full"
                  style={{ width: `${activeProfile.headToHead.historicalThreatScore}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400">FATIGUE RISK INDEX</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-extrabold text-cyan-400 font-mono">
                  {activeProfile.fatigueRiskCurrent}%
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeProfile.fatigueRiskCurrent > 40 ? "Elevated" : "Optimal"}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    activeProfile.fatigueRiskCurrent > 40 ? "bg-orange-500" : "bg-cyan-400"
                  }`}
                  style={{ width: `${activeProfile.fatigueRiskCurrent}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400">FORM (LAST 5 MATCHES)</span>
              <div className="flex items-center gap-1 mt-2">
                {activeProfile.recentFormRatings.map((rating, idx) => (
                  <span
                    key={idx}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      rating >= 8.5
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {rating}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 font-mono">
                Avg: {(activeProfile.recentFormRatings.reduce((a, b) => a + b, 0) / activeProfile.recentFormRatings.length).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Head-to-Head Record vs Opponent */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  CAREER HEAD-TO-HEAD VS {activeProfile.headToHead.opponentTeam.toUpperCase()}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Direct Clash: <strong className="text-white">{activeProfile.headToHead.directOpponentMatchup}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 py-1 text-center font-mono">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">MATCHES</span>
                <span className="text-sm font-bold text-white">{activeProfile.headToHead.careerMatches}</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">W - D - L</span>
                <span className="text-sm font-bold text-white">
                  {activeProfile.headToHead.wins}-{activeProfile.headToHead.draws}-{activeProfile.headToHead.losses}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">GOALS</span>
                <span className="text-sm font-bold text-amber-400">{activeProfile.headToHead.goalsScored}</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ASSISTS</span>
                <span className="text-sm font-bold text-cyan-400">{activeProfile.headToHead.assists}</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">CHANCES CREATED</span>
                <span className="text-sm font-bold text-purple-400">{activeProfile.headToHead.chancesCreated}</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">1v1 DUEL WIN RATE</span>
                <span className="text-sm font-bold text-emerald-400">
                  {activeProfile.headToHead.directMatchupSuccessPct}%
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-300">Notable Head-to-Head Precedent:</strong> {activeProfile.headToHead.notableMoment}
              </span>
            </div>
          </div>

          {/* Coach Tactical Vulnerabilities & Countermeasures Playbook */}
          <div className="bg-slate-950/90 border border-amber-900/40 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  COACHING EXPLOITATION MATRIX & WEAKNESSES
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                PRO COACH DIRECTIVES
              </span>
            </div>

            {/* Recommended Coach Directive Box */}
            <div className="bg-red-950/30 border border-red-600/50 rounded-lg p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-red-300">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  RECOMMENDED IN-GAME DIRECTIVE FOR SQUAD:
                </span>
                <span className="text-[10px] font-mono text-red-400">
                  Assigned Target: {activeProfile.recommendedCoachDirective.targetDefenderOrMidfielder}
                </span>
              </div>
              <p className="text-xs text-white font-mono bg-slate-950/80 p-2 rounded border border-red-900/50">
                &quot;{activeProfile.recommendedCoachDirective.message}&quot;
              </p>
            </div>

            {/* Individual Vulnerabilities list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              {activeProfile.vulnerabilities.map((v, i) => (
                <div key={i} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">{v.area}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                        v.severity === "critical"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {v.severity} vulnerability
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{v.description}</p>
                  <p className="text-[11px] text-emerald-400 font-medium border-t border-slate-800 pt-1 mt-0.5">
                    💡 <strong>Coach Strategy:</strong> {v.coachExploitAdvice}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Season Historical Stats Table */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  MULTI-SEASON HISTORICAL PERFORMANCE EVOLUTION
                </h4>
              </div>

              {/* Season Tabs */}
              <div className="flex items-center gap-1">
                {activeProfile.seasons.map((s, idx) => (
                  <button
                    key={s.season}
                    onClick={() => setSelectedSeasonIndex(idx)}
                    className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition-all ${
                      selectedSeasonIndex === idx
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {s.season}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Season Detail Stats Grid */}
            {activeProfile.seasons[selectedSeasonIndex] && (
              (() => {
                const s = activeProfile.seasons[selectedSeasonIndex];
                return (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-center font-mono">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">MATCHES (MINS)</span>
                        <span className="text-xs font-bold text-white">
                          {s.appearances} ({s.minutesPlayed}&apos;)
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">GOALS (xG)</span>
                        <span className="text-xs font-bold text-amber-400">
                          {s.goals} ({s.xg})
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">ASSISTS (xA)</span>
                        <span className="text-xs font-bold text-cyan-400">
                          {s.assists} ({s.xa})
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">PASS ACCURACY</span>
                        <span className="text-xs font-bold text-emerald-400">{s.passAccuracyPct}%</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">KEY PASSES / 90</span>
                        <span className="text-xs font-bold text-purple-400">{s.keyPassesPer90}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">PROG. PASSES / 90</span>
                        <span className="text-xs font-bold text-indigo-400">{s.progressivePassesPer90}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">TACKLES / 90</span>
                        <span className="text-xs font-bold text-white">{s.tacklesPer90}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">INTERCEPTIONS / 90</span>
                        <span className="text-xs font-bold text-white">{s.interceptionsPer90}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">GROUND DUELS %</span>
                        <span className="text-xs font-bold text-amber-300">{s.groundDuelsWonPct}%</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">AERIAL DUELS %</span>
                        <span className="text-xs font-bold text-amber-300">{s.aerialDuelsWonPct}%</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">AVG DISTANCE</span>
                        <span className="text-xs font-bold text-cyan-300">{s.avgDistanceKmPer90} km</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">TOP SPRINT SPEED</span>
                        <span className="text-xs font-bold text-red-400">{s.topSpeedKmh} km/h</span>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
