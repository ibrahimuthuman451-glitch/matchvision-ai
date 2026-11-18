import React from "react";
import { Link } from "../lib/router";
import { SiteShell } from "./SiteChrome";
import { FALLBACK_PLANS } from "../lib/api";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Crosshair,
  DatabaseZap,
  Gauge,
  Layers,
  Lock,
  Radio,
  ScanLine,
  Sparkles,
  Timer,
  Users,
  Video,
} from "lucide-react";

const STATS = [
  { value: "105 × 68 m", label: "FIFA pitch homography model" },
  { value: "5 suites", label: "Automated engine tests" },
  { value: "6 workspaces", label: "Role-based dashboards" },
  { value: "JSON API", label: "Portable match exports" },
];

const FEATURES = [
  {
    icon: ScanLine,
    title: "Pitch calibration you can trust",
    body: "Ground-contact foot projection with RANSAC homography, calibration quality scoring and explicit degraded-mode signalling when landmarks are weak.",
  },
  {
    icon: Crosshair,
    title: "Persistent player tracking",
    body: "Two-stage ByteTrack association with Kalman prediction, a lost-track buffer for occlusions and appearance similarity for identity recovery.",
  },
  {
    icon: Layers,
    title: "Team & jersey clustering",
    body: "CIE-Lab torso sampling, grass and glare suppression, colour clustering and temporal voting so team labels do not flicker frame to frame.",
  },
  {
    icon: BarChart3,
    title: "Tactical metrics that matter",
    body: "Defensive line height, team length and width, convex-hull compactness, PPDA, expected threat grids and shot quality in one model.",
  },
  {
    icon: Radio,
    title: "Broadcast production suite",
    body: "Lower thirds, tactical banners, telestration, sponsor rotation and clean-feed control for directors and pundit desks.",
  },
  {
    icon: DatabaseZap,
    title: "Match library & API",
    body: "Every processed match becomes a validated JSON artefact. Upload it, share it with your staff, export it into your own data stack.",
  },
];

const WORKFLOW = [
  {
    icon: Video,
    step: "01",
    title: "Process the footage",
    body: "Run the MatchVision engine on broadcast or tactical video, on your own hardware or a private cloud worker. Calibration, tracking and events are computed locally.",
  },
  {
    icon: ClipboardList,
    step: "02",
    title: "Export the match artefact",
    body: "The pipeline emits a versioned match JSON: players, pitch coordinates, kinematics, team shape metrics and the full event timeline.",
  },
  {
    icon: Users,
    step: "03",
    title: "Share in the workspace",
    body: "Upload the artefact to your organisation, then open reports and dashboards with the analysts, coaches and broadcast staff who need them.",
  },
];

const PILLARS = [
  { icon: Lock, title: "Private by default", body: "Workspace isolation, scrypt password hashing, HttpOnly sessions and origin-checked mutations." },
  { icon: Timer, title: "Fast on CPU", body: "The demo pipeline runs a 1280×720 match end to end at roughly 17 ms per frame on a single core." },
  { icon: Boxes, title: "Deploy anywhere", body: "Single-container Node service with SQLite, or point DATABASE_PATH at a mounted volume in your own environment." },
  { icon: Gauge, title: "Measured, not guessed", body: "Every report is derived from tracking output. When the model cannot calibrate, the product says so instead of inventing numbers." },
];

export const Landing: React.FC = () => {
  const plans = FALLBACK_PLANS;

  return (
    <SiteShell active="product">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(6,182,212,0.18),_transparent_55%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8 pt-16 pb-20 lg:pt-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              Computer vision for football operations
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-black tracking-tight leading-[1.05] text-white">
              Turn match footage into a{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                tactical command centre
              </span>
              .
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-xl">
              MatchVision AI tracks every player, calibrates the pitch to FIFA dimensions, detects the
              events that decide matches and delivers them to analysts, coaches and broadcast teams —
              in one secure web workspace.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-xl shadow-cyan-500/25"
              >
                Create your workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition-colors"
              >
                Sign in to your workspace
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-500 font-mono">
              No install for the web workspace · Upload a pipeline export in under two minutes
            </p>

            <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <dt className="text-lg font-black text-white">{stat.value}</dt>
                  <dd className="text-[11px] text-slate-500 leading-snug mt-1">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <PitchPreview />
        </div>
      </section>

      {/* Product pillars */}
      <section className="border-y border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="flex gap-3">
              <span className="mt-0.5 grid place-items-center w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 shrink-0">
                <pillar.icon className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">{pillar.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">{pillar.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 lg:px-8 py-20 scroll-mt-20">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">Platform</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">
            One engine, every football workflow
          </h2>
          <p className="mt-4 text-slate-400 leading-relaxed">
            The same calibrated tracking data powers live broadcast graphics, post-match punditry,
            coaching analysis, scouting reports and front-office decisions.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-white/5 bg-slate-900/60 p-6 hover:border-cyan-400/30 hover:bg-slate-900 transition-colors"
            >
              <span className="grid place-items-center w-10 h-10 rounded-xl bg-slate-950 text-cyan-300 border border-white/10 group-hover:border-cyan-400/30 transition-colors">
                <feature.icon className="w-5 h-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="border-y border-white/5 bg-slate-900/30 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">Workflow</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">
                From footage to shared analysis in three steps
              </h2>
              <p className="mt-4 text-slate-400 leading-relaxed">
                MatchVision keeps the heavy computer vision work on your infrastructure and gives
                your staff a clean, permissioned web layer on top of the results.
              </p>
              <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950 p-5 font-mono text-xs overflow-x-auto">
                <p className="text-slate-500"># 1. run the engine on a match</p>
                <p className="text-cyan-300">python main.py --mode process --video match.mp4 --export-json match.json</p>
                <p className="mt-3 text-slate-500"># 2. or generate a full synthetic demo</p>
                <p className="text-cyan-300">python main.py --mode demo --export-json demo_match.json</p>
                <p className="mt-3 text-slate-500"># 3. upload match.json in your workspace</p>
                <p className="text-emerald-400">/app/library → Upload match artefact</p>
              </div>
            </div>

            <ol className="space-y-4">
              {WORKFLOW.map((item) => (
                <li key={item.step} className="flex gap-4 rounded-2xl border border-white/5 bg-slate-950/60 p-5">
                  <span className="grid place-items-center w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 shrink-0">
                    <item.icon className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-cyan-500">{item.step}</span>
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>


      {/* Pricing preview */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 lg:px-8 py-20 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">Pricing</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">
              Plans that scale with your analysis team
            </h2>
          </div>
          <Link to="/pricing" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1">
            Compare plans <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.id === "club"
                  ? "border-cyan-400/40 bg-gradient-to-b from-cyan-500/10 to-slate-900/60 shadow-2xl shadow-cyan-500/10"
                  : "border-white/5 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                {plan.id === "club" && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 bg-cyan-400/10 border border-cyan-400/30 rounded-full px-2 py-0.5">
                    Most popular
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">
                  {plan.priceMonthly === null ? "Custom" : `£${plan.priceMonthly}`}
                </span>
                {plan.priceMonthly !== null && <span className="text-sm text-slate-500">/month</span>}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {plan.seatLimit} seats · {plan.matchLimit >= 100000 ? "Unlimited" : plan.matchLimit} matches / month
              </p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to={plan.id === "enterprise" ? "/signup?plan=enterprise" : "/signup"}
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                  plan.id === "club"
                    ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    : "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                }`}
              >
                {plan.priceMonthly === null ? "Talk to sales" : "Start free"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 bg-slate-900/30">
        <div className="mx-auto max-w-4xl px-5 lg:px-8 py-20">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Questions teams ask before switching
          </h2>
          <div className="mt-8 divide-y divide-white/5 rounded-2xl border border-white/5 bg-slate-950/60">
            {[
              {
                q: "Do we need to send our footage to MatchVision?",
                a: "No. The computer vision engine runs where you deploy it — your workstation, your server or a private cloud worker. The web workspace stores the JSON artefacts your team uploads, not the video.",
              },
              {
                q: "Which video sources are supported?",
                a: "Any file OpenCV can decode — broadcast MP4, tactical camera feeds and club recordings. Live RTSP/RTMP ingest is available in the Enterprise deployment.",
              },
              {
                q: "What happens if the pitch cannot be calibrated?",
                a: "The engine labels the match as degraded and the report surfaces that status. You will never see confident pitch metrics generated from a failed calibration.",
              },
              {
                q: "Can we keep everything on-premise?",
                a: "Yes. The web application ships as a single container with a mounted database volume, and the CV engine is a standalone Python package. Enterprise agreements include deployment support.",
              },
            ].map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-100">
                  {item.q}
                  <span className="text-cyan-400 text-lg leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/15 via-slate-900 to-indigo-500/15 p-8 sm:p-12">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Bring your next match into the workspace
              </h2>
              <p className="mt-3 text-slate-300 max-w-2xl leading-relaxed">
                Create a workspace, upload a pipeline export from the demo match and see the analysis
                your staff would work from on a matchday.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors"
              >
                Create workspace <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/security"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Security overview
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
};

const PitchPreview: React.FC = () => {
  const players = [
    { x: 150, y: 120, team: "a" },
    { x: 190, y: 190, team: "a" },
    { x: 120, y: 250, team: "a" },
    { x: 230, y: 80, team: "a" },
    { x: 260, y: 300, team: "a" },
    { x: 330, y: 190, team: "b" },
    { x: 360, y: 110, team: "b" },
    { x: 385, y: 260, team: "b" },
    { x: 430, y: 170, team: "b" },
    { x: 450, y: 250, team: "b" },
  ];

  return (
    <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-cyan-950/40">
      <div className="flex items-center justify-between px-2 pb-3">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-400">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Live tactical feed
        </div>
        <span className="text-[10px] font-mono text-slate-500">ARS 1 — 1 MCI · 68:20</span>
      </div>

      <div className="rounded-2xl bg-emerald-900/40 border border-emerald-500/20 overflow-hidden">
        <svg viewBox="0 0 520 380" className="w-full h-auto" role="img" aria-label="Tactical pitch visualisation">
          <defs>
            <linearGradient id="turf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b3b2b" />
              <stop offset="100%" stopColor="#0a2e22" />
            </linearGradient>
          </defs>
          <rect width="520" height="380" fill="url(#turf)" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={i * 65} y="0" width="65" height="380" fill={i % 2 ? "#0d4432" : "#0b3b2b"} opacity="0.55" />
          ))}
          <g stroke="#cbd5e1" strokeOpacity="0.45" strokeWidth="2" fill="none">
            <rect x="24" y="24" width="472" height="332" rx="2" />
            <line x1="260" y1="24" x2="260" y2="356" />
            <circle cx="260" cy="190" r="46" />
            <rect x="24" y="105" width="62" height="170" />
            <rect x="434" y="105" width="62" height="170" />
            <rect x="24" y="145" width="24" height="90" />
            <rect x="472" y="145" width="24" height="90" />
          </g>
          <line x1="330" y1="24" x2="330" y2="356" stroke="#f43f5e" strokeWidth="2" strokeDasharray="6 6" opacity="0.8" />
          <text x="336" y="42" fill="#fb7185" fontSize="10" fontFamily="monospace">def line 41.8m</text>
          <polygon points="150,120 190,190 120,250 230,80 260,300" fill="#22d3ee" fillOpacity="0.08" stroke="#22d3ee" strokeOpacity="0.4" strokeWidth="1.5" />
          {players.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="10" fill={p.team === "a" ? "#ef4444" : "#38bdf8"} opacity="0.18" />
              <circle cx={p.x} cy={p.y} r="6" fill={p.team === "a" ? "#ef4444" : "#38bdf8"} stroke="#0f172a" strokeWidth="1.5" />
            </g>
          ))}
          <circle cx="300" cy="215" r="4" fill="#fbbf24" />
          <path d="M300 215 L350 190" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          { label: "Compactness", value: "712 m²", tone: "text-cyan-300" },
          { label: "PPDA", value: "8.4", tone: "text-emerald-300" },
          { label: "Field tilt", value: "56.2%", tone: "text-indigo-300" },
        ].map((chip) => (
          <div key={chip.label} className="rounded-lg border border-white/5 bg-slate-950/70 px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{chip.label}</p>
            <p className={`text-sm font-black font-mono ${chip.tone}`}>{chip.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 px-1 text-[10px] text-slate-500 font-mono">
        Sample tactical view · pitch coordinates in metres
      </p>
    </div>
  );
};
