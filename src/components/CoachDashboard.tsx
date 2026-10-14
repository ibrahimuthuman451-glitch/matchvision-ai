import React, { useState } from "react";
import {
  TeamStats,
  Player,
  BroadcastGraphic,
  CoachDirective,
  TelestrationAnnotation,
} from "../types/match";
import { CoachMatchDossier } from "./CoachMatchDossier";
import { AiTacticalAssistant } from "./AiTacticalAssistant";
import { PlayerHistoryAnalytics } from "./PlayerHistoryAnalytics";
import {
  Compass,
  Shield,
  Target,
  Flame,
  Zap,
  CheckCircle2,
  Copy,
  Printer,
  ArrowRight,
  TrendingUp,
  Layers,
  Activity,
  AlertTriangle,
  FileText,
  Sliders,
  Sparkles,
  Send,
  MessageSquare,
  Users,
  Clock,
  Radio,
  Search,
} from "lucide-react";

interface CoachDashboardProps {
  stats: TeamStats[];
  players: Player[];
  directives: CoachDirective[];
  onAddDirective: (directive: CoachDirective) => void;
  onTransmitToScreen?: (graphic: BroadcastGraphic) => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({
  stats,
  players,
  directives,
  onAddDirective,
  onTransmitToScreen,
}) => {
  const [activeSection, setActiveSection] = useState<
    "overview" | "player_history" | "directives" | "fatigue_subs" | "opposition_dossier" | "setpieces"
  >("overview");

  const [selectedTargetPlayerId, setSelectedTargetPlayerId] = useState<number>(7); // Saka
  const [directiveMessage, setDirectiveMessage] = useState("");
  const [directiveType, setDirectiveType] = useState<"positional" | "pressing" | "tempo" | "setpiece">("positional");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSendDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveMessage.trim()) return;

    const targetPlayer = players.find((p) => p.id === selectedTargetPlayerId) || players[0];

    const newDirective: CoachDirective = {
      id: `DIR-${Date.now()}`,
      targetPlayerId: targetPlayer.id,
      targetPlayerName: targetPlayer.name,
      sender: "Mikel Arteta (Head Coach)",
      directiveType,
      message: directiveMessage.trim(),
      timestamp: "68:20",
      status: "active",
    };

    onAddDirective(newDirective);
    setDirectiveMessage("");
    showToast(`✓ Tactical directive transmitted to ${targetPlayer.name} (#${targetPlayer.number})`);
  };

  const quickDirectives = [
    {
      player: "Declan Rice",
      playerId: 41,
      type: "positional" as const,
      text: "Drop into back 3 during build-up to isolate Haaland and create 4v3 overload.",
    },
    {
      player: "Bukayo Saka",
      playerId: 7,
      type: "pressing" as const,
      text: "Pin Gvardiol wide; exploit space behind him during quick transitions.",
    },
    {
      player: "Martin Odegaard",
      playerId: 8,
      type: "tempo" as const,
      text: "Shift right to overload half-space with Saka and White; increase 1-touch tempo.",
    },
    {
      player: "William Saliba",
      playerId: 2,
      type: "positional" as const,
      text: "Maintain compact 41.8m offside trap; step up when De Bruyne turns backwards.",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold font-mono animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Coach Dashboard Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
            <Compass className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                HEAD COACH TACTICAL MATCH COMMAND & BRIEFING WORKSTATION
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
                MANAGER PORTAL · MIKEL ARTETA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live Tactical Overviews, In-Match Player Directives, Fatigue Radar & Opposition Scouting
            </p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto">
          {[
            { id: "overview", label: "Tactical Hub", icon: Activity },
            { id: "player_history", label: "Player History & Opponent Intel", icon: Search },
            { id: "directives", label: "Player Directives", icon: Send },
            { id: "fatigue_subs", label: "Fatigue & Subs", icon: Flame },
            { id: "opposition_dossier", label: "Opposition Dossier", icon: FileText },
          ].map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                  activeSection === sec.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 1: Overview & Tactical Hub */}
      {activeSection === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Live Tactical Telemetry (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Auto-Search Player History Quick Launcher Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-slate-900 border border-amber-600/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Search className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">
                      AUTO-SEARCH PLAYER HISTORICAL STATS & OPPONENT SCOUTING
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AUTO-INTEL
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Instantly retrieve multi-season stats, career H2H vs opponents, pressing triggers, and dispatch countermeasures to squad.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection("player_history")}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Player History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Top Tactical KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Current Formation</span>
                <div className="text-lg font-black text-cyan-400 mt-1">4-3-3 ATTACKING</div>
                <div className="text-[10px] text-slate-500 mt-0.5">10s Rolling Detection</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Field Tilt</span>
                <div className="text-lg font-black text-emerald-400 mt-1">64.2%</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Final 3rd Possession</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Press Intensity (PPDA)</span>
                <div className="text-lg font-black text-amber-400 mt-1">8.4 PPDA</div>
                <div className="text-[10px] text-slate-500 mt-0.5">High Press Threshold</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Defensive Line Height</span>
                <div className="text-lg font-black text-indigo-400 mt-1">41.8 m</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Compact Block Depth</div>
              </div>
            </div>

            {/* In-Match Live Directives Dispatcher Quick Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  QUICK TACTICAL INSTRUCTIONS TO BENCH & PLAYERS
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                  REAL-TIME DISPATCH
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickDirectives.map((qd, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400">{qd.player}</span>
                        <span className="text-[10px] font-mono uppercase text-slate-500">{qd.type}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{qd.text}</p>
                    </div>
                    <button
                      onClick={() => {
                        onAddDirective({
                          id: `DIR-Q-${Date.now()}-${idx}`,
                          targetPlayerId: qd.playerId,
                          targetPlayerName: qd.player,
                          sender: "M. Arteta (Head Coach)",
                          directiveType: qd.type,
                          message: qd.text,
                          timestamp: "68:20",
                          status: "active",
                        });
                        showToast(`✓ Sent instruction to ${qd.player}`);
                      }}
                      className="text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 py-1 px-2 rounded border border-cyan-800/80 transition-colors flex items-center justify-center gap-1"
                    >
                      <Send className="w-3 h-3" /> Transmit Instruction
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* In-Game Counter-Pressing Adjustments */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <h3 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                TACTICAL COUNTERMEASURES & PHASE ADJUSTMENTS
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <span className="p-1.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold text-[10px]">
                    PHASE 1
                  </span>
                  <div>
                    <h4 className="font-bold text-white">Pressing Trigger: Akanji Back-Pass</h4>
                    <p className="text-slate-400 mt-0.5">
                      Whenever Akanji receives on his weaker left foot, trigger Odegaard and Havertz curved runs to cut off Rodri and force Ederson long.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <span className="p-1.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono font-bold text-[10px]">
                    PHASE 2
                  </span>
                  <div>
                    <h4 className="font-bold text-white">Defensive Transition: Haaland Isolation</h4>
                    <p className="text-slate-400 mt-0.5">
                      Ensure Saliba maintains physical contact while Gabriel drops 3 yards deeper to sweep long diagonals from De Bruyne.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Directives Log (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Active Directives Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  TRANSMITTED DIRECTIVES LOG
                </span>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800 font-bold">
                  {directives.length} Sent
                </span>
              </div>

              <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                {directives.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    No tactical directives transmitted yet. Use the dispatch form below to message players.
                  </div>
                ) : (
                  directives.map((dir) => (
                    <div
                      key={dir.id}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-cyan-400" />
                          {dir.targetPlayerName}
                        </span>
                        <span className="text-slate-500">{dir.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug">{dir.message}</p>
                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                        <span className="text-slate-500 uppercase">{dir.directiveType}</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Acknowledged on Tablet
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Custom Directive Dispatcher Form */}
            <form
              onSubmit={handleSendDirective}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg"
            >
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                DISPATCH CUSTOM INSTRUCTION
              </span>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400">SELECT PLAYER</label>
                <select
                  value={selectedTargetPlayerId}
                  onChange={(e) => setSelectedTargetPlayerId(parseInt(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} {p.name} ({p.role} · {p.teamName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400">INSTRUCTION TYPE</label>
                <select
                  value={directiveType}
                  onChange={(e) => setDirectiveType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="positional">Positional & Shape Adjustment</option>
                  <option value="pressing">Pressing Trigger</option>
                  <option value="tempo">Tempo & Passing Acceleration</option>
                  <option value="setpiece">Set-Piece Assignment</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400">COACH MESSAGE</label>
                <textarea
                  value={directiveMessage}
                  onChange={(e) => setDirectiveMessage(e.target.value)}
                  placeholder="Enter strategic adjustment for this player's tablet..."
                  rows={2}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-900/30"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch to Player Tablet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Section 2: Player Historical Stats & Opponent Intelligence Auto-Search */}
      {activeSection === "player_history" && (
        <PlayerHistoryAnalytics
          players={players}
          onAddDirective={onAddDirective}
          onTransmitToScreen={onTransmitToScreen}
          initialSelectedPlayerId={14}
        />
      )}

      {/* Section 3: Directives tab */}
      {activeSection === "directives" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-400" />
                COACHING STAFF DIRECTIVES COMMAND CONSOLE
              </h3>
              <p className="text-xs text-slate-400">
                Directives are synchronized immediately with players' smart wristbands and sideline tablets
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickDirectives.map((qd, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{qd.player}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                      {qd.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{qd.text}</p>
                </div>
                <button
                  onClick={() => {
                    onAddDirective({
                      id: `DIR-${Date.now()}-${idx}`,
                      targetPlayerId: qd.playerId,
                      targetPlayerName: qd.player,
                      sender: "M. Arteta (Head Coach)",
                      directiveType: qd.type,
                      message: qd.text,
                      timestamp: "68:20",
                      status: "active",
                    });
                    showToast(`✓ Directive sent to ${qd.player}`);
                  }}
                  className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" /> Transmit Directive
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Fatigue & Subs */}
      {activeSection === "fatigue_subs" && (
        <AiTacticalAssistant stats={stats} players={players} />
      )}

      {/* Section 4: Opposition Dossier */}
      {activeSection === "opposition_dossier" && (
        <CoachMatchDossier
          stats={stats}
          players={players}
          onTransmitToScreen={onTransmitToScreen}
        />
      )}
    </div>
  );
};
