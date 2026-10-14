import React, { useState } from "react";
import { Sparkles, Brain, Send, Bot, User, Loader2, Lightbulb } from "lucide-react";
import { TeamStats, Player } from "../types/match";

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
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to MatchVision Tactical AI. I am running high-level spatial reasoning powered by Gemini with Thinking Mode enabled. Ask any question regarding team shape, line-breaking passes, pressing intensity, or individual tracking metrics.",
      model: "gemini-4-argon (Thinking Level: HIGH)",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sampleQuestions = [
    "Analyze Arsenal's defensive line height (41.8m) against Haaland's sprint runs",
    "Evaluate Man City's build-up efficiency through Rodri and De Bruyne",
    "Where is the largest tactical space overload currently occurring?",
    "Recommend immediate tactical adjustments to break down City's mid-block",
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const matchContext = {
        teams: stats,
        activePlayerCount: players.length,
        selectedDefensiveLineHeights: {
          Arsenal: stats[0].defLineHeightM,
          ManCity: stats[1].defLineHeightM,
        },
        compactness: {
          Arsenal: stats[0].compactnessM2,
          ManCity: stats[1].compactnessM2,
        },
      };

      const res = await fetch("/api/tactical-query", {
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
        model: `${data.model || "gemini-4-argon"} (Thinking Level: HIGH)`,
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[520px] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              MATCHVISION AI TACTICAL THINKING ENGINE
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] font-mono text-indigo-300">
                gemini-4-argon · ThinkingLevel.HIGH
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-800/60">
        <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="text-[11px] whitespace-nowrap bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50"
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
              Computing spatial reasoning and tactical simulations with Thinking Mode...
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pt-2 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask tactical consultant (e.g. 'How can City exploit Arsenal's right half-space?')..."
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
  );
};
