import React, { useState } from "react";
import { MatchEvent } from "../types/match";
import { Play, Filter, Zap, Target, ArrowRight, ShieldAlert, Award } from "lucide-react";

interface EventTimelineProps {
  events: MatchEvent[];
  currentSec: number;
  onSeek: (timeSec: number) => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events, currentSec, onSeek }) => {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredEvents = events.filter((ev) => {
    if (filterType === "all") return true;
    return ev.type === filterType;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case "shot":
        return <Target className="w-3.5 h-3.5 text-amber-400" />;
      case "pass":
        return <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />;
      case "turnover":
        return <ShieldAlert className="w-3.5 h-3.5 text-red-400" />;
      case "final_third_entry":
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Award className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-100">MATCH EVENTS FEED</h3>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
            {events.length}
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1">
          {["all", "shot", "pass", "final_third_entry", "turnover"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterType(cat)}
              className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                filterType === cat
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {cat === "final_third_entry" ? "Final 3rd" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="mt-3 space-y-2 overflow-y-auto max-h-[340px] pr-1 scrollbar-thin scrollbar-thumb-slate-700">
        {filteredEvents.map((ev) => {
          const isNear = Math.abs(currentSec - ev.timeSec) < 3;
          return (
            <div
              key={ev.id}
              onClick={() => onSeek(ev.timeSec)}
              className={`group flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                isNear
                  ? "bg-cyan-950/40 border-cyan-500/50 shadow-sm"
                  : "bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
              }`}
            >
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-800 group-hover:bg-slate-700">
                {getEventIcon(ev.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {ev.timestamp}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        ev.teamId === 0
                          ? "bg-red-500/20 text-red-300"
                          : "bg-sky-500/20 text-sky-300"
                      }`}
                    >
                      {ev.teamId === 0 ? "Arsenal" : "Man City"}
                    </span>
                    <span className="text-xs font-medium text-slate-300 truncate">
                      #{ev.playerNumber} {ev.playerName}
                    </span>
                  </div>

                  {ev.xg && (
                    <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                      xG {ev.xg.toFixed(2)}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 group-hover:text-slate-300">
                  {ev.description}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(ev.timeSec);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-cyan-400"
                title="Seek to event timestamp"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
