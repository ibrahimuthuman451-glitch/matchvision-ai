import React, { useState } from "react";
import { SystemPipelineTelemetry, UserProfile, INITIAL_USERS } from "../types/match";
import {
  Cpu,
  Shield,
  Activity,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Terminal,
  Database,
  Users,
  Radio,
  Lock,
  Eye,
  RefreshCw,
  HardDrive,
  Download,
} from "lucide-react";

interface AdminDashboardProps {
  onRecalibrateHomography: () => void;
  onFlushBuffer: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onRecalibrateHomography,
  onFlushBuffer,
}) => {
  const [telemetry, setTelemetry] = useState<SystemPipelineTelemetry>({
    yoloFps: 72.4,
    yoloLatencyMs: 13.8,
    byteTrackConsistencyPct: 99.8,
    homographyRmsErrorM: 0.028,
    gpuUtilizationPct: 44,
    gpuVramUsedGb: 14.2,
    gpuVramTotalGb: 48,
    gpuTempC: 59,
    activeSockets: 1842,
    streamBitrateMbps: 22.5,
    droppedFrames: 0,
    calibrationStatus: "OPTIMAL",
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Permission settings matrix
  const [permissions, setPermissions] = useState({
    broadcast_trigger_graphics: true,
    broadcast_inject_sponsors: true,
    coach_transmit_directives: true,
    coach_simulate_subs: true,
    player_view_biometrics: true,
    fan_crowd_voting: true,
    cv_debug_bounding_boxes: true,
  });

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
    showToast(`✓ Permission '${key}' updated`);
  };

  // System audit log
  const [auditLogs, setAuditLogs] = useState([
    { time: "00:05:12", level: "INFO", source: "CV_PIPELINE", message: "YOLOv8 & ByteTrack tracking 22/22 players + ball with 99.8% confidence" },
    { time: "00:04:45", level: "INFO", source: "HOMOGRAPHY", message: "Touchline Homography auto-aligned. RMS reprojection error: 0.028m" },
    { time: "00:03:50", level: "ACTION", source: "BROADCAST", message: "Director Jenkins triggered Lower-Third graphic 'ARSENAL HIGH PRESS'" },
    { time: "00:03:10", level: "ACTION", source: "COACH", message: "Coach Arteta dispatched tactical directive to Saka #7 ('Pin Gvardiol wide')" },
    { time: "00:02:22", level: "SECURITY", source: "AUTH", message: "Enterprise session authenticated for user 'David Thorne (SuperAdmin)'" },
    { time: "00:01:05", level: "STREAM", source: "INGEST", message: "SRT 1080p60 feed locked at 22.5 Mbps HEVC, 0 dropped frames" },
  ]);

  const handleTriggerRecalibration = () => {
    onRecalibrateHomography();
    setAuditLogs((prev) => [
      {
        time: new Date().toLocaleTimeString(),
        level: "ACTION",
        source: "ADMIN_OVERRIDE",
        message: "Manual homography recalibration executed by Admin. 4 corner markers realigned.",
      },
      ...prev,
    ]);
    showToast("✓ Pitch touchline homography recalibrated successfully!");
  };

  const handleClearBuffer = () => {
    onFlushBuffer();
    setAuditLogs((prev) => [
      {
        time: new Date().toLocaleTimeString(),
        level: "ACTION",
        source: "ADMIN_OVERRIDE",
        message: "CV inference ring buffer flushed and re-synced to keyframe.",
      },
      ...prev,
    ]);
    showToast("✓ Video ingestion ring buffer flushed!");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold font-mono animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Admin Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                SYSTEM ADMINISTRATOR & COMPUTER VISION INFRASTRUCTURE
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                ADMIN CONSOLE · SUPERADMIN ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              YOLOv8 Inference Pipeline, Pitch Homography Calibration, Edge GPU Cluster & Access Control
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerRecalibration}
            className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recalibrate Homography
          </button>
          <button
            onClick={handleClearBuffer}
            className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5" />
            Flush Video Buffer
          </button>
        </div>
      </div>

      {/* System Health Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">YOLOv8 Latency</span>
          <div className="text-xl font-black text-cyan-400 mt-1">{telemetry.yoloLatencyMs} ms</div>
          <div className="text-[10px] font-mono text-emerald-400 mt-1">{telemetry.yoloFps} FPS · Real-Time</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">ByteTrack Tracking</span>
          <div className="text-xl font-black text-emerald-400 mt-1">{telemetry.byteTrackConsistencyPct}%</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">22/22 Players Locked</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Homography Error</span>
          <div className="text-xl font-black text-white mt-1">{telemetry.homographyRmsErrorM} m</div>
          <div className="text-[10px] font-mono text-emerald-400 mt-1">RMS Optimal (&lt;0.05m)</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">NVIDIA RTX A6000</span>
          <div className="text-xl font-black text-amber-400 mt-1">{telemetry.gpuUtilizationPct}%</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">14.2 / 48GB · 59°C</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">SRT Stream Ingest</span>
          <div className="text-xl font-black text-purple-400 mt-1">{telemetry.streamBitrateMbps} Mbps</div>
          <div className="text-[10px] font-mono text-emerald-400 mt-1">HEVC · 0 Dropped</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Active Subscribers</span>
          <div className="text-xl font-black text-cyan-400 mt-1">{telemetry.activeSockets}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">WebSocket Mesh</div>
        </div>
      </div>

      {/* Main Admin Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: RBAC Permission Matrix & Users (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                ROLE-BASED ACCESS CONTROL (RBAC) POLICY MATRIX
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                ENFORCED
              </span>
            </div>

            <div className="space-y-2 mt-1">
              {[
                { key: "broadcast_trigger_graphics", label: "Broadcast: Trigger Live On-Air Lower Thirds", role: "Broadcast Director" },
                { key: "broadcast_inject_sponsors", label: "Broadcast: Commercial Sponsor Bug Insertion", role: "Commercial Desk" },
                { key: "coach_transmit_directives", label: "Coach: Transmit Live Directives to Player Tablets", role: "Coaching Staff" },
                { key: "coach_simulate_subs", label: "Coach: Execute Simulated Lineup Substitutions", role: "Tactical Analyst" },
                { key: "player_view_biometrics", label: "Player: Access High-Resolution GPS & Exertion", role: "First Team Players" },
                { key: "fan_crowd_voting", label: "Fan: Live In-Match Crowd Poll Participation", role: "Spectators / Fans" },
                { key: "cv_debug_bounding_boxes", label: "Admin: Render Raw YOLO Bounding Boxes & Confidence", role: "CV Engineers" },
              ].map(({ key, label, role }) => {
                const active = permissions[key as keyof typeof permissions];
                return (
                  <div
                    key={key}
                    onClick={() => togglePermission(key as keyof typeof permissions)}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{label}</div>
                      <div className="text-[10px] font-mono text-slate-500">Allowed Scope: {role}</div>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                        active ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          active ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Pre-Configured Persona Accounts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-3">
            <h3 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              SYSTEM DEMO PERSONA ACCOUNTS (5 STAKEHOLDER PROFILES)
            </h3>
            <div className="space-y-2">
              {INITIAL_USERS.map((user) => (
                <div
                  key={user.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: user.avatarColor }}
                    />
                    <div>
                      <div className="font-bold text-white">{user.name}</div>
                      <div className="text-[10px] text-slate-400">{user.title}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                      {user.badge}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">{user.accessLevel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Audit Log & Terminal (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                SYSTEM EVENT & SECURITY AUDIT STREAM
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Auto-Scrolling</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs flex flex-col gap-2 max-h-[480px] overflow-y-auto">
              {auditLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="text-slate-500 shrink-0">{log.time}</span>
                  <span
                    className={`font-bold shrink-0 ${
                      log.level === "ACTION"
                        ? "text-cyan-400"
                        : log.level === "SECURITY"
                        ? "text-amber-400"
                        : log.level === "STREAM"
                        ? "text-purple-400"
                        : "text-emerald-400"
                    }`}
                  >
                    [{log.source}]
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-2 border-t border-slate-800/80">
              <span>Cluster Node: lon1-edge-gpu-04</span>
              <span className="text-emerald-400 font-bold">● Hardware Health: 100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
