import React, { useState } from "react";
import { UserProfile, INITIAL_USERS, UserRole } from "../types/match";
import {
  Users,
  Shield,
  Key,
  LogIn,
  CheckCircle2,
  Tv,
  Compass,
  Activity,
  Glasses,
  Cpu,
  X,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
} from "lucide-react";

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}) => {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | "all">("all");
  const [customEmail, setCustomEmail] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [customRole, setCustomRole] = useState<UserRole>("coach");
  const [activeTab, setActiveTab] = useState<"quick_profiles" | "custom_login">("quick_profiles");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) {
      setErrorMessage("Please enter an email address.");
      return;
    }

    const newUser: UserProfile = {
      id: `USER-CUSTOM-${Date.now()}`,
      name: customEmail.split("@")[0].toUpperCase() || "Authorized User",
      role: customRole,
      title: `${customRole.toUpperCase()} · Custom Session`,
      avatarColor: customRole === "coach" ? "#ef4444" : customRole === "player" ? "#f59e0b" : customRole === "broadcast" ? "#38bdf8" : customRole === "fan" ? "#8b5cf6" : "#10b981",
      badge: customRole.toUpperCase(),
      email: customEmail,
      accessLevel: customRole === "admin" ? "SuperAdmin" : customRole === "coach" ? "Executive" : "Athlete",
      preferredDashboard: customRole,
    };

    onSelectUser(newUser);
    onClose();
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "coach":
        return <Compass className="w-5 h-5 text-red-400" />;
      case "player":
        return <Activity className="w-5 h-5 text-amber-400" />;
      case "broadcast":
        return <Tv className="w-5 h-5 text-sky-400" />;
      case "fan":
        return <Glasses className="w-5 h-5 text-purple-400" />;
      case "admin":
        return <Cpu className="w-5 h-5 text-emerald-400" />;
    }
  };

  const filteredUsers =
    selectedRoleFilter === "all"
      ? INITIAL_USERS
      : INITIAL_USERS.filter((u) => u.role === selectedRoleFilter);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-900/40">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                MATCHVISION AI AUTHENTICATION & ROLE ACCESS
              </h2>
              <p className="text-xs text-slate-400">
                Switch user persona to access role-specific telemetry, controls, and workflows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Account Banner */}
        <div className="bg-slate-950/60 px-6 py-3 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-slate-400">Currently Logged In:</span>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentUser.avatarColor }}
              />
              <span className="text-xs font-bold text-white">{currentUser.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 font-bold border border-slate-700">
                {currentUser.badge}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Session Active
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-900 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab("quick_profiles")}
            className={`pb-3 text-xs font-bold font-mono transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "quick_profiles"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            1-Click Persona Accounts (5 Roles)
          </button>
          <button
            onClick={() => setActiveTab("custom_login")}
            className={`pb-3 text-xs font-bold font-mono transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "custom_login"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock className="w-4 h-4" />
            Custom Credential Sign-In
          </button>
        </div>

        {/* Tab 1: 1-Click Role Profiles */}
        {activeTab === "quick_profiles" && (
          <div className="p-6 flex flex-col gap-4 max-h-[500px] overflow-y-auto">
            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-slate-500 mr-1">FILTER ROLE:</span>
              {(["all", "coach", "player", "fan", "broadcast", "admin"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-mono font-semibold uppercase transition-colors ${
                    selectedRoleFilter === r
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
                  }`}
                >
                  {r === "all" ? "All Profiles" : r}
                </button>
              ))}
            </div>

            {/* List of Persona Profiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUsers.map((user) => {
                const isCurrent = currentUser.id === user.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isCurrent
                        ? "bg-slate-950 border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500"
                        : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                            {getRoleIcon(user.role)}
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                              {user.badge}
                            </span>
                            <h4 className="text-sm font-extrabold text-white leading-tight">
                              {user.name}
                            </h4>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-1">{user.title}</p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">{user.email}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Access: {user.accessLevel}</span>
                      <button className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1">
                        {isCurrent ? "Current" : "Switch To →"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Credentials Sign In */}
        {activeTab === "custom_login" && (
          <form onSubmit={handleCustomLogin} className="p-6 flex flex-col gap-4">
            <div className="text-xs text-slate-400">
              Sign in with institutional credentials for Premier League club analysts, broadcasters, or stadium staff:
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-slate-300">ROLE IDENTIFIER</label>
              <select
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value as UserRole)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="coach">Head Coach / Tactical Analyst</option>
                <option value="player">First Team Player / Athlete</option>
                <option value="fan">Matchday Spectator / AR Fan</option>
                <option value="broadcast">Broadcast Director / Media Producer</option>
                <option value="admin">Computer Vision System Administrator</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" /> EMAIL ADDRESS
              </label>
              <input
                type="email"
                placeholder="analyst@club.com or director@broadcaster.tv"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" /> ACCESS TOKEN / PASSWORD
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="mt-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-cyan-900/30"
            >
              <LogIn className="w-4 h-4" />
              Authenticate & Launch Workspace
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Enterprise Multi-Role Auth Active</span>
          <span>MatchVision AI Security Token v2.4</span>
        </div>
      </div>
    </div>
  );
};
