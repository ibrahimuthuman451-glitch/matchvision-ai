import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Brain,
  Send,
  Bot,
  User,
  Loader2,
  Lightbulb,
  BatteryWarning,
  BatteryCharging,
  Zap,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Flame,
  CheckCircle2,
  ArrowLeftRight,
  Gauge,
  Activity,
  Layers,
  Clock,
  UserCheck,
} from "lucide-react";
import { TeamStats, Player } from "../types/match";
import {
  calculatePlayerFatigue,
  generateSubstitutionRecommendations,
  PlayerFatigueData,
  SubstitutionRecommendation,
  BENCH_PLAYERS,
} from "../services/fatigueAnalytics";

interface AiTacticalAssistantProps {
  stats: TeamStats[];
  players: Player[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
}

export const AiTacticalAssistant: React.FC<AiTacticalAssistantProps> = ({ stats, players }) => {
  // Navigation tab within Assistant
  const [activeTab, setActiveTab] = useState<"chat" | "fatigue">("fatigue");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to MatchVision Tactical AI. I am continuously monitoring kinematic fatigue, distance telemetry, and tactical spacing.\n\n⚡ **Active Match Status (68:20)**: High physical fatigue detected on Saka (82%), Partey (84%), and Gündoğan (84%). You can explore the **Fatigue & High-Impact Subs** radar tab or ask tactical questions below.",
      model: "gemini-2.5-pro (Thinking Level: HIGH)",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Fatigue & Substitution state
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<"all" | 0 | 1>("all");
  const [sortBy, setSortBy] = useState<"fatigue" | "distance" | "sprints">("fatigue");
  const [simulatedSubs, setSimulatedSubs] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calculate fatigue data for all active outfield players
  const fatigueProfiles = useMemo(() => {
    return players
      .filter((p) => p.role !== "REF")
      .map(calculatePlayerFatigue);
  }, [players]);

  // Generate substitutions
  const recommendations = useMemo(() => {
    return generateSubstitutionRecommendations(players);
  }, [players]);

  // Filtered and sorted profiles
  const displayedProfiles = useMemo(() => {
    return fatigueProfiles
      .filter((fp) => {
        if (selectedTeamFilter === "all") return true;
        return fp.player.teamId === selectedTeamFilter;
      })
      .sort((a, b) => {
        if (sortBy === "fatigue") return b.fatigueIndex - a.fatigueIndex;
        if (sortBy === "distance") return b.distanceCoveredKm - a.distanceCoveredKm;
        return b.sprintCount - a.sprintCount;
      });
  }, [fatigueProfiles, selectedTeamFilter, sortBy]);

  // Summary statistics
  const team0Profiles = fatigueProfiles.filter((p) => p.player.teamId === 0 && p.player.role !== "GK");
  const team1Profiles = fatigueProfiles.filter((p) => p.player.teamId === 1 && p.player.role !== "GK");
  const team0AvgFatigue = Math.round(
    team0Profiles.reduce((acc, p) => acc + p.fatigueIndex, 0) / (team0Profiles.length || 1)
  );
  const team1AvgFatigue = Math.round(
    team1Profiles.reduce((acc, p) => acc + p.fatigueIndex, 0) / (team1Profiles.length || 1)
  );
  const criticalPlayersCount = fatigueProfiles.filter((p) => p.tier === "Critical").length;

  const sampleQuestions = [
    "Suggest high-impact substitutions for fatigued players",
    "Analyze Saka's sprint fatigue vs Gvardiol's recovery speed",
    "Evaluate Man City's build-up efficiency through Rodri and De Bruyne",
    "How does introducing Trossard change Arsenal's pressing shape?",
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Package rich match context including live fatigue analytics
      const matchContext = {
        teams: stats,
        activePlayerCount: players.length,
        fatigueSummary: {
          arsenalAvgFatigue: `${team0AvgFatigue}%`,
          manCityAvgFatigue: `${team1AvgFatigue}%`,
          criticalCount: criticalPlayersCount,
          topFatiguedPlayers: fatigueProfiles
            .slice(0, 5)
            .map((fp) => ({
              name: fp.player.name,
              team: fp.player.teamName,
              fatigue: `${fp.fatigueIndex}%`,
              distance: `${fp.distanceCoveredKm}km`,
              sprints: fp.sprintCount,
              speedDrop: `${fp.speedDropPercentage}%`,
              vulnerability: fp.tacticalVulnerability,
            })),
          suggestedSubs: recommendations.slice(0, 3).map((r) => ({
            out: `${r.outPlayer.player.name} (${r.outPlayer.fatigueIndex}% Fatigue)`,
            in: `${r.inPlayer.name} (${r.inPlayer.tag})`,
            priority: r.priority,
            timing: r.timingRecommendation,
            rationale: r.tacticalRationale,
          })),
        },
      };

      const res = await fetch("/api/ai/tactical-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          matchContext,
        }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer || "No response received.",
        model: `${data.model || "gemini-2.5-pro"} (Thinking Level: HIGH)`,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Analysis error: ${err.message || "Failed to communicate with tactical server"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSub = (recId: string, outName: string, inName: string) => {
    setSimulatedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(recId)) {
        next.delete(recId);
      } else {
        next.add(recId);
      }
      return next;
    });

    const isNowSimulated = !simulatedSubs.has(recId);
    showToast(
      isNowSimulated
        ? `Tactical Sub Simulated: ${inName} ON for ${outName} (Tactical shape adjusted)`
        : `Substitution reverted: ${outName} restored to active lineup`
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const handleAskGeminiAboutSub = (rec: SubstitutionRecommendation) => {
    setActiveTab("chat");
    handleSend(
      `Deep tactical assessment: Recommend impact of substituting ${rec.inPlayer.name} (${rec.inPlayer.tag}) for ${rec.outPlayer.player.name} (${rec.outPlayer.fatigueIndex}% fatigue, ${rec.outPlayer.distanceCoveredKm}km covered). Focus on pressing triggers and 1v1 isolation matchups.`
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[680px] shadow-lg relative overflow-hidden">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 border border-emerald-400 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 tracking-wide">
              MATCHVISION AI TACTICAL ASSISTANT
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-indigo-300">
                gemini-2.5-pro · Real-Time Kinematics & Spatial Reasoning
              </span>
            </div>
          </div>
        </div>

        {/* Top View Selector Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("fatigue")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "fatigue"
                ? "bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <BatteryWarning className="w-3.5 h-3.5 text-amber-400" />
            <span>Fatigue & High-Impact Subs</span>
            {criticalPlayersCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40">
                {criticalPlayersCount} Critical
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "chat"
                ? "bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Tactical Consultant</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: FATIGUE & HIGH-IMPACT SUBSTITUTIONS ================= */}
      {activeTab === "fatigue" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-3">
          {/* Top KPI Telemetry Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pb-3">
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Arsenal Fatigue
                </span>
                <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
                  {team0AvgFatigue}% <span className="text-xs text-rose-400 font-normal">Elevated</span>
                </div>
              </div>
              <Gauge className="w-5 h-5 text-rose-400/80" />
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Man City Fatigue
                </span>
                <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
                  {team1AvgFatigue}% <span className="text-xs text-cyan-400 font-normal">Elevated</span>
                </div>
              </div>
              <Gauge className="w-5 h-5 text-cyan-400/80" />
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> Critical Risk
                </span>
                <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                  {criticalPlayersCount} Players
                </div>
              </div>
              <ShieldAlert className="w-5 h-5 text-amber-400/80" />
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" /> High-Impact Subs
                </span>
                <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">
                  {recommendations.length} Readied
                </div>
              </div>
              <UserCheck className="w-5 h-5 text-emerald-400/80" />
            </div>
          </div>

          {/* Sub-Header Controls & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-y border-slate-800/80 bg-slate-950/40 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-400">TEAM FILTER:</span>
              {(["all", 0, 1] as const).map((tId) => (
                <button
                  key={String(tId)}
                  onClick={() => setSelectedTeamFilter(tId)}
                  className={`px-2.5 py-0.5 text-xs rounded-md font-medium transition-colors ${
                    selectedTeamFilter === tId
                      ? "bg-slate-800 text-white font-bold border border-slate-700"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tId === "all" ? "All Players" : tId === 0 ? "Arsenal" : "Man City"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-400">SORT BY:</span>
              {[
                { id: "fatigue", label: "Fatigue %" },
                { id: "distance", label: "Distance (km)" },
                { id: "sprints", label: "Sprints" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id as any)}
                  className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                    sortBy === s.id
                      ? "bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main 2-Column Split: High-Impact Recommendations (Left) & Live Fatigue Telemetry (Right) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 pt-3 overflow-hidden">
            {/* LEFT COLUMN: HIGH-IMPACT SUBSTITUTION RECOMMENDATIONS (7 cols) */}
            <div className="lg:col-span-7 flex flex-col min-h-0 overflow-hidden bg-slate-950/60 rounded-xl border border-slate-800 p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Recommended High-Impact Substitutions ({recommendations.length})
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("chat");
                    handleSend("Suggest high-impact substitutions for fatigued players");
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Ask Gemini Assessment
                </button>
              </div>

              {/* Scrollable Substitution Cards */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {recommendations.map((rec) => {
                  const isSimulated = simulatedSubs.has(rec.id);
                  const isArsenal = rec.outPlayer.player.teamId === 0;

                  return (
                    <div
                      key={rec.id}
                      className={`rounded-xl border p-3 transition-all ${
                        isSimulated
                          ? "bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/30"
                          : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                              rec.priority === "URGENT"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                                : rec.priority === "HIGH"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            }`}
                          >
                            {rec.priority}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {rec.timingRecommendation}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isArsenal ? "bg-red-500/20 text-red-300" : "bg-sky-500/20 text-sky-300"
                          }`}
                        >
                          {rec.outPlayer.player.teamName}
                        </span>
                      </div>

                      {/* Side-by-side Visual Swap Graphic */}
                      <div className="grid grid-cols-11 gap-2 items-center bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60 mb-2.5">
                        {/* OUT: Fatigued Player (5 cols) */}
                        <div className="col-span-5 bg-rose-950/30 border border-rose-500/30 rounded-md p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                              <TrendingDown className="w-3 h-3 text-rose-400" /> OUT (SUB OFF)
                            </span>
                            <span className="text-[10px] font-mono text-rose-300 font-bold">
                              {rec.outPlayer.fatigueIndex}% FATIGUED
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-slate-100">
                              #{rec.outPlayer.player.number} {rec.outPlayer.player.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({rec.outPlayer.player.role})
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400 font-mono flex items-center gap-2">
                            <span>{rec.outPlayer.distanceCoveredKm} km</span>
                            <span>·</span>
                            <span>{rec.outPlayer.sprintCount} Sprints</span>
                            <span>·</span>
                            <span className="text-rose-400">-{rec.outPlayer.recoveryPaceLossKmh} km/h pace</span>
                          </div>
                        </div>

                        {/* Swap Arrow (1 col) */}
                        <div className="col-span-1 flex justify-center">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* IN: Fresh Substitute (5 cols) */}
                        <div className="col-span-5 bg-emerald-950/30 border border-emerald-500/30 rounded-md p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-emerald-400" /> IN (SUB ON)
                            </span>
                            <span className="text-[10px] font-mono text-emerald-300 font-bold flex items-center gap-1">
                              <BatteryCharging className="w-3 h-3" /> 100% FRESH
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-emerald-200">
                              #{rec.inPlayer.number} {rec.inPlayer.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({rec.inPlayer.role})
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-emerald-300 font-mono">
                            Top Speed: {rec.inPlayer.topSpeedKmh} km/h · {rec.inPlayer.tag}
                          </div>
                        </div>
                      </div>

                      {/* Tactical Rationale */}
                      <p className="text-xs text-slate-300 leading-relaxed mb-2 bg-slate-950/40 p-2 rounded border border-slate-800/40">
                        {rec.tacticalRationale}
                      </p>

                      {/* Projected Gains Metric Badges */}
                      <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-center">
                          <div className="text-[9px] text-slate-400 font-mono">PRESS BOOST</div>
                          <div className="text-[11px] font-bold font-mono text-emerald-400">
                            {rec.projectedGains.pressingIntensityBoost}
                          </div>
                        </div>
                        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-center">
                          <div className="text-[9px] text-slate-400 font-mono">PACE GAIN</div>
                          <div className="text-[11px] font-bold font-mono text-cyan-400">
                            {rec.projectedGains.speedAdvantageKmh}
                          </div>
                        </div>
                        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-center">
                          <div className="text-[9px] text-slate-400 font-mono">WORK RATE</div>
                          <div className="text-[11px] font-bold font-mono text-indigo-400">
                            {rec.projectedGains.defensiveWorkRateBoost}
                          </div>
                        </div>
                        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-center">
                          <div className="text-[9px] text-slate-400 font-mono">xT CREATED</div>
                          <div className="text-[11px] font-bold font-mono text-amber-400">
                            {rec.projectedGains.xtGain}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-400 font-mono">
                          Target Zone: <span className="text-slate-300">{rec.keyBattle}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAskGeminiAboutSub(rec)}
                            className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium transition-colors flex items-center gap-1"
                          >
                            <Brain className="w-3 h-3" />
                            Deep Dive
                          </button>
                          <button
                            onClick={() =>
                              handleSimulateSub(rec.id, rec.outPlayer.player.name, rec.inPlayer.name)
                            }
                            className={`px-3 py-1 text-xs rounded font-semibold transition-all flex items-center gap-1.5 ${
                              isSimulated
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40"
                            }`}
                          >
                            {isSimulated ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                <span>Simulated On Pitch</span>
                              </>
                            ) : (
                              <>
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>Simulate Sub</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: INDIVIDUAL SQUAD FATIGUE TELEMETRY (5 cols) */}
            <div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden bg-slate-950/60 rounded-xl border border-slate-800 p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Squad Fatigue & Kinematics ({displayedProfiles.length})
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Speed decay & distance vs benchmark
                </span>
              </div>

              {/* Scrollable Player Fatigue List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {displayedProfiles.map((fp) => {
                  const isRed = fp.tier === "Critical";
                  const isAmber = fp.tier === "High";
                  const isGreen = fp.tier === "Fresh";

                  return (
                    <div
                      key={fp.player.id}
                      className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono ${
                              fp.player.teamId === 0
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            }`}
                          >
                            {fp.player.number}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-100">{fp.player.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                              {fp.player.role} · {fp.player.teamName}
                            </span>
                          </div>
                        </div>

                        {/* Tier Badge */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            isRed
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : isAmber
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : isGreen
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {fp.fatigueIndex}% {fp.tier.toUpperCase()}
                        </span>
                      </div>

                      {/* Fatigue Gauge Progress Bar */}
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                          <span>Physical Exertion</span>
                          <span
                            className={
                              isRed ? "text-rose-400 font-bold" : isAmber ? "text-amber-400" : "text-emerald-400"
                            }
                          >
                            {fp.staminaRemaining}% Stamina Remaining
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isRed
                                ? "bg-gradient-to-r from-amber-500 to-rose-500"
                                : isAmber
                                ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                                : "bg-gradient-to-r from-emerald-500 to-teal-400"
                            }`}
                            style={{ width: `${fp.fatigueIndex}%` }}
                          />
                        </div>
                      </div>

                      {/* Granular Tracking Telemetry */}
                      <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-mono bg-slate-950/60 p-1.5 rounded border border-slate-800/40">
                        <div>
                          <span className="text-slate-500">DIST: </span>
                          <span className="text-slate-200 font-semibold">{fp.distanceCoveredKm} km</span>
                        </div>
                        <div>
                          <span className="text-slate-500">SPRINTS: </span>
                          <span className="text-slate-200 font-semibold">{fp.sprintCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">PACE: </span>
                          <span className="text-slate-200 font-semibold">{fp.currentSpeedKmh} km/h</span>
                        </div>
                      </div>

                      {/* Tactical Vulnerability Diagnosis */}
                      <div className="mt-1.5 text-[10px] text-slate-400 leading-snug">
                        <span className="text-amber-400/90 font-medium">Risk: </span>
                        {fp.tacticalVulnerability}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: AI TACTICAL CONSULTANT (CHAT) ================= */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0 pt-2">
          {/* Suggested Quick Prompts */}
          <div className="py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-800/60">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={loading}
                className={`text-[11px] whitespace-nowrap rounded-full px-2.5 py-1 transition-colors disabled:opacity-50 border ${
                  q.includes("substitutions")
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 font-medium"
                    : "bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border-slate-800"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                    m.role === "user"
                      ? "bg-cyan-600/30 text-cyan-100 border border-cyan-500/30"
                      : "bg-slate-950/70 text-slate-200 border border-slate-800"
                  }`}
                >
                  {m.model && (
                    <div className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      {m.model}
                    </div>
                  )}
                  <div className="whitespace-pre-line">{m.content}</div>

                  {m.role === "assistant" && m.content.toLowerCase().includes("substitut") && (
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Inspect active fatigue radar & player benchmarks:
                      </span>
                      <button
                        onClick={() => setActiveTab("fatigue")}
                        className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40"
                      >
                        <BatteryWarning className="w-3 h-3 text-amber-400" />
                        Open Fatigue & Sub Radar
                      </button>
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-md bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-300">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-indigo-400 text-xs py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-mono animate-pulse">
                  Computing kinematic fatigue matrices and spatial substitutions with Thinking Mode...
                </span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="pt-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask tactical consultant (e.g. 'How does bringing on Doku exploit Arsenal's tired right flank?')..."
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
