import React, { useState } from "react";
import {
  Shield,
  Target,
  Flame,
  Zap,
  CheckCircle2,
  Copy,
  Printer,
  Compass,
  ArrowRight,
  TrendingUp,
  Layers,
  Activity,
  AlertTriangle,
  FileText,
  Sliders,
  Sparkles,
} from "lucide-react";
import { TeamStats, Player, BroadcastGraphic } from "../types/match";

interface CoachMatchDossierProps {
  stats: TeamStats[];
  players: Player[];
  onTransmitToScreen?: (graphic: BroadcastGraphic) => void;
}

export const CoachMatchDossier: React.FC<CoachMatchDossierProps> = ({
  stats,
  players,
  onTransmitToScreen,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<"arsenal" | "mancity">("arsenal");
  const [activeSection, setActiveSection] = useState<"tactics" | "scouting" | "setpieces" | "report">("tactics");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleTransmitTacticalCard = (title: string, subtitle: string) => {
    if (!onTransmitToScreen) return;
    onTransmitToScreen({
      id: `BG-COACH-${Date.now()}`,
      type: "tactical_banner",
      title,
      subtitle,
      accentColor: selectedTeam === "arsenal" ? "#ef4444" : "#0ea5e9",
      badgeText: "COACHING MATCH REPORT",
      isOnAir: true,
      position: "bottom",
      timestamp: "68:20",
      author: "Coaching Staff",
    });
    showToast(`✓ Transmitted coaching insight to live broadcast graphics!`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 shadow-2xl relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 border border-emerald-400 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40">
            <Compass className="w-6 h-6 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide">
                COACHING & OPPOSITION TACTICAL DOSSIER
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                PRO COACHING SUITE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Automated tactical match plan, opponent pressing triggers, rest defense structure, set-piece playbooks, and exportable print dossiers
            </p>
          </div>
        </div>

        {/* Team Perspective Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 ml-2 mr-1">COACH PERSPECTIVE:</span>
          <button
            onClick={() => setSelectedTeam("arsenal")}
            className={`px-3 py-1.5 text-xs rounded-md font-bold transition-all flex items-center gap-1.5 ${
              selectedTeam === "arsenal"
                ? "bg-red-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            Arsenal (Mikel Arteta)
          </button>
          <button
            onClick={() => setSelectedTeam("mancity")}
            className={`px-3 py-1.5 text-xs rounded-md font-bold transition-all flex items-center gap-1.5 ${
              selectedTeam === "mancity"
                ? "bg-sky-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-950" />
            Man City (Pep Guardiola)
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveSection("tactics")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSection === "tactics"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Phase Breakdown & Rest Defense
          </button>

          <button
            onClick={() => setActiveSection("scouting")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSection === "scouting"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Opposition Pressing Triggers (PPDA)
          </button>

          <button
            onClick={() => setActiveSection("setpieces")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSection === "setpieces"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Set-Piece Routines Playbook
          </button>

          <button
            onClick={() => setActiveSection("report")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSection === "report"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Printable Coaching Match Dossier
          </button>
        </div>

        <button
          onClick={handlePrint}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Tactical Plan
        </button>
      </div>

      {/* ================= SECTION 1: PHASE BREAKDOWN & REST DEFENSE ================= */}
      {activeSection === "tactics" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Phase 1: In-Possession Build-Up */}
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  PHASE 1 · BUILD-UP STRUCTURE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300">
                  {selectedTeam === "arsenal" ? "3-2-5 Shape" : "3-2-4-1 Shape"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                {selectedTeam === "arsenal"
                  ? "Inverted Fullback Overload (Timber into Pivot)"
                  : "Stones / Lewis Inversion to Free De Bruyne"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {selectedTeam === "arsenal"
                  ? "Timber steps alongside Partey to form a 2-man defensive pivot, allowing Rice and Odegaard to push into advanced half-spaces. Saka isolates against Gvardiol."
                  : "Stones pushes into central midfield alongside Rodri, creating a +1 overload in the center and allowing Gundogan and De Bruyne to flood the half-spaces."}
              </p>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Defensive Line Height: {selectedTeam === "arsenal" ? "41.8m" : "44.2m"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Compactness: {selectedTeam === "arsenal" ? "440 m²" : "485 m²"}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                handleTransmitTacticalCard(
                  `${selectedTeam.toUpperCase()} BUILD-UP TACTIC`,
                  selectedTeam === "arsenal"
                    ? "Inverted 3-2-5 shape pinning City wingers"
                    : "Midfield box overload isolating Haaland in channel"
                )
              }
              className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Transmit to Broadcast Screen
            </button>
          </div>

          {/* Phase 2: Rest Defense & Transition Prevention */}
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                  PHASE 2 · REST DEFENSE (3+2 STRUCTURE)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300">
                  Transition Lock
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                {selectedTeam === "arsenal"
                  ? "Saliba & Gabriel Staggered Cover Shadow"
                  : "Dias & Akanji Counter-Press Barrier"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {selectedTeam === "arsenal"
                  ? "Saliba marks Haaland tightly while Gabriel drops 3 meters deeper as sweeping cover. Partey and Rice sit on edge of final third to suffocate direct counter passes."
                  : "Rodri operates as central anchor. When possession is lost, City immediately compress within 5 seconds (PPDA 7.9) to stop Martinelli breakaways."}
              </p>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-amber-300">
                <span className="font-bold font-mono text-[10px] block uppercase">Coaching Key:</span>
                Never let both fullbacks push beyond the halfway line simultaneously. Maintain 3-2 rest defense cage.
              </div>
            </div>

            <button
              onClick={() =>
                handleTransmitTacticalCard(
                  `REST DEFENSE BLUEPRINT`,
                  "Staggered 3+2 rest defense cage shutting down direct central counters"
                )
              }
              className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Transmit to Broadcast Screen
            </button>
          </div>

          {/* Phase 3: Weakness Exploitation */}
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  PHASE 3 · OPPONENT WEAKNESS EXPLOITATION
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300">
                  Target Zone
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                {selectedTeam === "arsenal"
                  ? "Overload Gvardiol's Inside Shoulder"
                  : "Exploit Space Behind White's High Line"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {selectedTeam === "arsenal"
                  ? "Gvardiol pushes forward to support attacks, leaving 28 meters of space behind him. Quick diagonal switches from Gabriel to Saka create direct 1v1 footraces."
                  : "Ben White has completed 16 sprints and is at 74% fatigue. Bringing on Doku creates severe 1v1 pressure on Arsenal's right defensive flank."}
              </p>
              <div className="space-y-1 text-xs font-mono text-emerald-400">
                <div>• Expected Threat Differential: +0.24 xT</div>
                <div>• Opponent Turnovers in Zone: 6 in 2nd Half</div>
              </div>
            </div>

            <button
              onClick={() =>
                handleTransmitTacticalCard(
                  `TACTICAL EXPLOITATION ZONE`,
                  selectedTeam === "arsenal"
                    ? "Targeting space behind Gvardiol via Saka 1v1"
                    : "Targeting fatigued Ben White via Doku isolation"
                )
              }
              className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Transmit to Broadcast Screen
            </button>
          </div>
        </div>
      )}

      {/* ================= SECTION 2: PRESSING TRIGGERS (PPDA) ================= */}
      {activeSection === "scouting" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              High-Pressing Triggers & Trap Blueprint
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              When the opponent circulates possession, do not press blindly. Trigger the collective 5-man pressing trap upon the following specific visual cues:
            </p>
            <div className="space-y-3">
              {[
                {
                  trigger: "Backward pass to goalkeeper (Ederson / Raya)",
                  action: "Front 3 sprint in curving arcs cutting off centerbacks, forcing long clearance into touch.",
                  successRate: "78% forced turnover",
                },
                {
                  trigger: "Fullback receives ball facing own touchline with closed body angle",
                  action: "Winger and nearest central midfielder double-team immediately, trapping fullback against sideline.",
                  successRate: "84% possession regain",
                },
                {
                  trigger: "Bouncing pass or heavy second touch in midfield third",
                  action: "Central pivot (Rice / Rodri) steps up aggressively to initiate turnover counter-attack.",
                  successRate: "91% duel win rate",
                },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                    <span>TRIGGER #{idx + 1}: {item.trigger}</span>
                    <span className="text-[10px] font-mono text-emerald-400">{item.successRate}</span>
                  </div>
                  <p className="text-xs text-slate-300">{item.action}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live PPDA (Passes Per Defensive Action)
              </h3>
              <p className="text-xs text-slate-300 mb-4">
                Lower PPDA indicates more intense, suffocating defensive pressure.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Arsenal PPDA</span>
                  <div className="text-2xl font-black font-mono text-red-400 mt-1">8.4</div>
                  <span className="text-[10px] text-emerald-400 font-mono">Elite High Press</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Man City PPDA</span>
                  <div className="text-2xl font-black font-mono text-sky-400 mt-1">7.9</div>
                  <span className="text-[10px] text-emerald-400 font-mono">Aggressive Counter-Press</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200">
                <span className="font-bold font-mono text-[10px] uppercase block mb-1 text-indigo-300">
                  Analyst Recommendation:
                </span>
                Maintain compact defensive block (sub-450 m²). When opponent breaks first pressing line, immediately collapse into mid-block rather than chasing individual ball carriers.
              </div>
            </div>

            <button
              onClick={() =>
                handleTransmitTacticalCard(
                  `PRESSING INTENSITY: PPDA 8.4`,
                  "Arsenal high press forcing 14 Man City turnovers in defensive third"
                )
              }
              className="mt-4 px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Broadcast Pressing Graphic
            </button>
          </div>
        </div>
      )}

      {/* ================= SECTION 3: SET-PIECES ================= */}
      {activeSection === "setpieces" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: "Corner Routine A: Near-Post Flick",
              delivery: "Whipped in-swinger to 6-yard corner",
              targets: "Gabriel Magalhães & Havertz",
              setup: "Blocker creates separation on goalkeeper; runner attacks near post with glancing header to back post.",
              xG: "0.22 xG per attempt",
            },
            {
              name: "Corner Routine B: Penalty Spot Cluster",
              delivery: "Driven float to 11 meters",
              targets: "William Saliba & Declan Rice",
              setup: "4 players start on 18-yard line in tight pack, then disperse in opposite directions to confuse zonal markers.",
              xG: "0.19 xG per attempt",
            },
            {
              name: "Short Corner Overload Routine",
              delivery: "Quick 2-man pass and inside curve",
              targets: "Bukayo Saka & Martin Ødegaard",
              setup: "Draws 2 defenders out of 18-yard box, opening up back-post cross corridor for trailing centerback.",
              xG: "0.26 xG per attempt",
            },
          ].map((routine, idx) => (
            <div key={idx} className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
                  OFFICIAL PLAYBOOK #{idx + 1}
                </span>
                <h3 className="text-sm font-bold text-white mb-2">{routine.name}</h3>
                <div className="space-y-1.5 text-xs text-slate-300 mb-3">
                  <div>
                    <span className="text-slate-500">Delivery: </span>
                    <span className="text-slate-200">{routine.delivery}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Primary Targets: </span>
                    <span className="text-emerald-400 font-semibold">{routine.targets}</span>
                  </div>
                  <p className="text-slate-400 text-xs pt-1 leading-relaxed">{routine.setup}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400">{routine.xG}</span>
                <button
                  onClick={() =>
                    handleTransmitTacticalCard(
                      routine.name.toUpperCase(),
                      `Targeting ${routine.targets} (${routine.xG})`
                    )
                  }
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  Transmit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= SECTION 4: PRINTABLE REPORT ================= */}
      {activeSection === "report" && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 flex flex-col gap-4 text-slate-100 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
                OFFICIAL COACHING MATCH REPORT · PREMIER LEAGUE
              </span>
              <h3 className="text-lg font-black text-white mt-0.5">
                ARSENAL FC vs MANCHESTER CITY FC (68:20)
              </h3>
              <p className="text-xs text-slate-400">
                Prepared for Manager & Coaching Backroom Staff
              </p>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF Dossier
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <h4 className="font-bold text-slate-200 uppercase font-mono mb-2">1. Tactical Game State</h4>
              <p className="text-slate-300 leading-relaxed">
                Score: 1-1. Arsenal's high press has successfully restricted Manchester City's build-up through Rodri to horizontal circulation. However, high sprint fatigue on Saka (82%) and Partey (84%) creates vulnerabilities in late defensive transition.
              </p>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <h4 className="font-bold text-slate-200 uppercase font-mono mb-2">2. Tactical Adjustments Required for Minute 70+</h4>
              <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                <li>Execute substitution: Introduce Leandro Trossard for Bukayo Saka to restore pressing dynamism.</li>
                <li>Drop Rice deeper alongside Partey to fortify the central 2-man rest defense cage.</li>
                <li>Direct long clearances into the left half-space to exploit Gvardiol's advanced positioning.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
