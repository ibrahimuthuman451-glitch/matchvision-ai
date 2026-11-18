import React, { useState } from "react";
import { Link, navigate } from "../lib/router";
import { BrandMark } from "./SiteChrome";
import type { SessionUser, Usage } from "../lib/api";
import { LogOut, ChevronDown, LayoutDashboard, FolderOpen, ShieldCheck } from "lucide-react";

interface WorkspaceShellProps {
  user: SessionUser;
  usage?: Usage;
  onLogout: () => void;
  active?: "studio" | "library";
  children: React.ReactNode;
}

const ROLE_LABEL: Record<string, string> = {
  analyst: "Analyst",
  coach: "Coach",
  broadcaster: "Broadcast",
  admin: "Admin",
};

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({ user, usage, onLogout, active, children }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link to="/app" aria-label="Workspace home"><BrandMark size="sm" /></Link>
            <span className="hidden sm:block h-6 w-px bg-white/10" />
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                to="/app"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active === "studio" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Studio
              </Link>
              <Link
                to="/app/library"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active === "library" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" /> Match library
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {usage && (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono text-slate-400">
                {usage.matches}/{usage.limits.matches} matches · {usage.members}/{usage.limits.seats} seats
              </span>
            )}
            <span className="hidden lg:inline-flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
              {user.plan}
            </span>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 hover:bg-white/10 transition-colors"
                aria-expanded={menuOpen}
              >
                <span className="grid place-items-center w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-indigo-500 text-[11px] font-black text-slate-950">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:block text-left leading-tight">
                  <span className="block text-xs font-bold text-white">{user.name}</span>
                  <span className="block text-[10px] text-slate-500">{user.orgName}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 p-2 z-50">
                  <div className="px-2 py-2 border-b border-white/5">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <p className="mt-1.5 text-[10px] font-mono text-cyan-300">
                      {user.orgName} · {ROLE_LABEL[user.role] || user.role}
                      {user.isAdmin ? " · Workspace admin" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); navigate("/app/library"); }}
                    className="w-full mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Match library
                  </button>
                  <Link
                    to="/security"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Security & data
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); onLogout(); }}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-rose-300 hover:bg-rose-500/10"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/5 mt-10">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            Signed in as <span className="text-slate-300">{user.email}</span> · {user.orgName}
          </span>
          <span className="flex items-center gap-3">
            <Link to="/privacy" className="hover:text-slate-300">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-300">Terms</Link>
            <Link to="/security" className="hover:text-slate-300">Security</Link>
          </span>
        </div>
      </footer>
    </div>
  );
};
