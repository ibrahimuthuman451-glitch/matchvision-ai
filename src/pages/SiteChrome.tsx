import React from "react";
import { Link } from "../lib/router";
import { Activity, ShieldCheck } from "lucide-react";

export const SUPPORT_EMAIL = "support@matchvision.ai";
export const COMPANY = "MatchVision Labs Ltd";

export const BrandMark: React.FC<{ size?: "sm" | "md" }> = ({ size = "md" }) => (
  <span className="flex items-center gap-2.5">
    <span
      className={`relative grid place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-slate-950 font-black shadow-lg shadow-sky-500/20 ${
        size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base"
      }`}
    >
      MV
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
    </span>
    <span className="leading-tight">
      <span className={`block font-black tracking-tight text-white ${size === "sm" ? "text-sm" : "text-base"}`}>
        MatchVision<span className="text-cyan-400">AI</span>
      </span>
      <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">
        Football intelligence
      </span>
    </span>
  </span>
);

export const SiteHeader: React.FC<{ active?: string }> = ({ active }) => {
  const link = (href: string, label: string, key: string) => (
    <Link
      to={href}
      className={`text-sm font-medium transition-colors ${
        active === key ? "text-white" : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between gap-6">
        <Link to="/" aria-label="MatchVision AI home">
          <BrandMark />
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {link("/#product", "Product", "product")}
          {link("/#features", "Features", "features")}
          {link("/pricing", "Pricing", "pricing")}
          {link("/security", "Security", "security")}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            to="/login"
            className="hidden sm:inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
};

export const SiteFooter: React.FC = () => (
  <footer className="border-t border-white/5 bg-slate-950">
    <div className="mx-auto max-w-7xl px-5 lg:px-8 py-14 grid gap-10 md:grid-cols-4">
      <div className="md:col-span-2 space-y-4">
        <BrandMark />
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
          MatchVision AI turns broadcast and tactical match footage into pitch-calibrated tracking,
          event detection and coaching-grade analysis — delivered as a secure web workspace.
        </p>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
          <ShieldCheck className="w-4 h-4" />
          Secure sessions · Workspace isolation · Auditable actions
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Product</h4>
        <ul className="space-y-2.5 text-sm text-slate-400">
          <li><Link to="/#features" className="hover:text-white transition-colors">Features</Link></li>
          <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
          <li><Link to="/#workflow" className="hover:text-white transition-colors">How it works</Link></li>
          <li><Link to="/app" className="hover:text-white transition-colors">Open workspace</Link></li>
        </ul>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Company</h4>
        <ul className="space-y-2.5 text-sm text-slate-400">
          <li><Link to="/security" className="hover:text-white transition-colors">Security</Link></li>
          <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
          <li><Link to="/terms" className="hover:text-white transition-colors">Terms</Link></li>
          <li>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors">
              {SUPPORT_EMAIL}
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <span>© {new Date().getFullYear()} {COMPANY}. All rights reserved.</span>
        <span className="flex items-center gap-1.5 font-mono">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Built for elite football analysis teams
        </span>
      </div>
    </div>
  </footer>
);

export const SiteShell: React.FC<{ active?: string; children: React.ReactNode }> = ({ active, children }) => (
  <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-400/30">
    <SiteHeader active={active} />
    <main>{children}</main>
    <SiteFooter />
  </div>
);
