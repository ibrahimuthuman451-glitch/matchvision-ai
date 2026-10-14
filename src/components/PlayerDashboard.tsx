import React, { useState, useMemo } from "react";
import { Player, CoachDirective, BroadcastGraphic } from "../types/match";
import {
  Activity,
  Zap,
  Heart,
  TrendingUp,
  Shield,
  Target,
  CheckCircle2,
  Clock,
  Compass,
  ArrowRight,
  Flame,
  Award,
  ChevronRight,
  Sparkles,
  Droplet,
  BatteryCharging,
  Maximize2,
  Users,
  Send,
  Sliders,
} from "lucide-react";

interface PlayerDashboardProps {
  players: Player[];
  selectedPlayerId?: number | null;
  onSelectPlayer: (id: number) => void;
  directives: CoachDirective[];
  onAcknowledgeDirective: (id: string) => void;
  onTransmitToScreen?: (graphic: BroadcastGraphic) => void;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  players,
  selectedPlayerId,
  onSelectPlayer,
  directives,
  onAcknowledgeDirective,
  onTransmitToScreen,
}) => {
  // Default to Bukayo Saka (#7 or id 9) or first player
  const defaultPlayer =
    players.find((p) => p.name.includes("Saka")) ||
    players.find((p) => p.id === selectedPlayerId) ||
    players[0];

  const [activePlayerId, setActivePlayerId] = useState<number>(defaultPlayer?.id || 9);
  const [activeTab, setActiveTab] = useState<"biometrics" | "tactics" | "recovery">("biometrics");

  const currentPlayer = players.find((p) => p.id === activePlayerId) || defaultPlayer;

  // Filter directives relevant to this player
  const myDirectives = useMemo(() => {
    return directives.filter(
      (d) =>
        d.targetPlayerId === currentPlayer.id ||
        d.targetPlayerName.toLowerCase().includes(currentPlayer.name.toLowerCase())
    );
  }, [directives, currentPlayer]);

  // Derived sports science metrics
  const distKm = (currentPlayer.distCoveredM / 1000).toFixed(2);
  const sprintCount = Math.floor(currentPlayer.distCoveredM / 420) + 12;
  const staminaRemaining = Math.max(38, Math.round(100 - (currentPlayer.distCoveredM / 1000) * 5.2));
  const heartRate = 168 + Math.floor((currentPlayer.speedKmh / 35) * 22);

  // Individual technical stats
  const technicalStats = [
    { label: "Pass Completion", value: "41/46 (89%)", change: "+4% vs season avg", highlight: true },
    { label: "Key Passes", value: "3", change: "Match High", highlight: true },
    { label: "Expected Threat (xT)", value: "0.42", change: "94th percentile", highlight: true },
    { label: "1v1 Take-ons", value: "4/6 (67%)", change: "Target: >60%", highlight: false },
    { label: "Duels Won", value: "7/9 (78%)", change: "+12% vs opponent", highlight: false },
    { label: "Touches in Box", value: "11", change: "Top in match", highlight: false },
    { label: "Pressing Pressures", value: "18", change: "Arteta target met", highlight: false },
    { label: "Top Sprint Speed", value: `${currentPlayer.speedKmh.toFixed(1)} km/h`, change: "Peak at 54'", highlight: false },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Top Player Workstation Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                PLAYER PERFORMANCE & ATHLETE BIOMETRIC WORKSTATION
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                ATHLETE PORTAL · #{currentPlayer.number} {currentPlayer.name.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live GPS Kinematics, Tactical Directives Received from Manager & Sports Science Recovery
            </p>
          </div>
        </div>

        {/* Player Roster Quick Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">SELECT ATHLETE:</span>
          <select
            value={activePlayerId}
            onChange={(e) => {
              const id = parseInt(e.target.value);
              setActivePlayerId(id);
              onSelectPlayer(id);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 font-bold"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.number} {p.name} ({p.role} · {p.teamName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Player Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Biometrics, GPS & Heart Rate (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Athlete Bio Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-amber-950/40">
                  #{currentPlayer.number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{currentPlayer.name}</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold">
                      {currentPlayer.role}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{currentPlayer.teamName}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    First Team Elite Protocol · Smart Shinguard & GPS Vest Sync Active
                  </p>
                </div>
              </div>

              {/* Transmit Player Card to Broadcast */}
              {onTransmitToScreen && (
                <button
                  onClick={() =>
                    onTransmitToScreen({
                      id: `BG-PLAYER-${currentPlayer.id}-${Date.now()}`,
                      type: "player_card",
                      title: `SPOTLIGHT: #${currentPlayer.number} ${currentPlayer.name.toUpperCase()}`,
                      subtitle: `Distance: ${distKm}km · Top Speed: ${currentPlayer.speedKmh.toFixed(1)} km/h · xT: 0.42`,
                      accentColor: "#f59e0b",
                      badgeText: "ATHLETE TELEMETRY",
                      isOnAir: true,
                      position: "bottom",
                      timestamp: "68:20",
                      author: "Player Biometrics Desk",
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Transmit Stats to Broadcast TV
                </button>
              )}
            </div>

            {/* GPS Telemetry Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>DISTANCE COVERED</span>
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-white mt-1">{distKm} <span className="text-xs text-slate-400">km</span></div>
                <div className="text-[10px] text-emerald-400 mt-1 font-mono">Target: 11.4 km (91% met)</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>STAMINA GAUGE</span>
                  <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 mt-1">{staminaRemaining}%</div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">Moderate Fatigue Tier</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>HEART RATE</span>
                  <Heart className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                </div>
                <div className="text-2xl font-black text-red-400 mt-1">{heartRate} <span className="text-xs text-slate-400">BPM</span></div>
                <div className="text-[10px] text-amber-400 mt-1 font-mono">Zone 4: Anaerobic</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>HIGH-SPEED SPRINTS</span>
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <div className="text-2xl font-black text-yellow-400 mt-1">{sprintCount}</div>
                <div className="text-[10px] text-emerald-400 mt-1 font-mono">Peak: {currentPlayer.speedKmh.toFixed(1)} km/h</div>
              </div>
            </div>
          </div>

          {/* Individual Technical Performance Output */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h4 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-cyan-400" />
              IN-MATCH TECHNICAL OUTPUT & METRIC BENCHMARKS
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {technicalStats.map((stat, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    stat.highlight
                      ? "bg-cyan-950/20 border-cyan-500/40"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{stat.label}</span>
                  <div className="text-base font-bold text-white mt-0.5">{stat.value}</div>
                  <div className="text-[10px] font-mono text-cyan-400 mt-0.5">{stat.change}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Pitch Map Simulation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                INDIVIDUAL ACTION RADIUS & ACTIVE TOUCHES
              </h4>
              <span className="text-[11px] font-mono text-slate-400">Coordinates: X: {currentPlayer.x.toFixed(1)}m, Y: {currentPlayer.y.toFixed(1)}m</span>
            </div>

            <div className="h-44 rounded-xl bg-emerald-950/40 border border-emerald-800/60 relative overflow-hidden flex items-center justify-center">
              {/* Pitch lines representation */}
              <div className="absolute inset-0 border-2 border-emerald-500/20 m-2 rounded-lg pointer-events-none" />
              <div className="absolute top-2 bottom-2 left-1/2 w-0.5 bg-emerald-500/20 -translate-x-1/2" />
              <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full border border-emerald-500/20 -translate-x-1/2 -translate-y-1/2" />

              {/* Player location marker with pulse */}
              <div
                className="absolute w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-[10px] font-black text-slate-950 shadow-lg shadow-amber-400/50 animate-pulse"
                style={{
                  left: `${((currentPlayer.x + 52.5) / 105) * 100}%`,
                  top: `${((currentPlayer.y + 34) / 68) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {currentPlayer.number}
              </div>

              {/* Trajectory history trail */}
              <div className="absolute bottom-3 left-4 text-xs font-mono text-emerald-300 bg-slate-950/80 px-3 py-1 rounded border border-emerald-800/80">
                Primary Activity Zone: Right Half-Space & Final Third Box Entry
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Directives Received & Recovery Protocol (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Tactical Directives from Coach */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                DIRECTIVES FROM HEAD COACH
              </span>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800 font-bold">
                {myDirectives.length} Received
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {myDirectives.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-400 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="font-semibold text-white">No active tactical directives right now.</p>
                  <p className="text-[11px] text-slate-500 mt-1">Continue executing the default 4-3-3 high-press role assignment.</p>
                </div>
              ) : (
                myDirectives.map((dir) => (
                  <div
                    key={dir.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 flex flex-col gap-2 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500" />
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-indigo-400 uppercase">{dir.sender}</span>
                      <span className="text-slate-500">{dir.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-snug font-sans">{dir.message}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{dir.directiveType}</span>
                      <button
                        onClick={() => onAcknowledgeDirective(dir.id)}
                        className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sports Science Recovery Protocol */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
            <h4 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-cyan-400" />
              POST-MATCH RECOVERY PROTOCOL
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Hydration Index</div>
                  <div className="text-[11px] text-slate-400">Target: 1,200 mL electrolyte intake</div>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">88% OPTIMAL</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Cryotherapy Window</div>
                  <div className="text-[11px] text-slate-400">3 mins @ -110°C chamber at T+45m</div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">SCHEDULED</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Lactic Acid Flush</div>
                  <div className="text-[11px] text-slate-400">12 min low-resistance stationary bike</div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">PENDING</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
