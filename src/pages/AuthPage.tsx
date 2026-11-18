import React, { useState } from "react";
import { Link, navigate, queryParam, useRoute } from "../lib/router";
import { api, ApiError, type SessionUser } from "../lib/api";
import { BrandMark, SiteFooter, COMPANY, SUPPORT_EMAIL } from "./SiteChrome";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";

interface AuthPageProps {
  mode: "login" | "signup";
  onAuthenticated: (user: SessionUser) => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
    {children}
  </label>
);

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none";

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onAuthenticated }) => {
  const route = useRoute();
  const next = queryParam(route, "next") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState("analyst");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = isSignup
        ? await api.signup({ email, password, name, orgName, role })
        : await api.login({ email, password });
      onAuthenticated(result.user);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("We could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="flex-1 grid lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-white/5 bg-slate-900/40 p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,_rgba(6,182,212,0.18),_transparent_60%)]" />
          <div className="relative">
            <Link to="/"><BrandMark /></Link>
            <h1 className="mt-14 text-3xl font-black tracking-tight leading-tight max-w-md">
              {isSignup
                ? "Set up your analysis workspace in under two minutes."
                : "Welcome back to your tactical workspace."}
            </h1>
            <p className="mt-4 text-slate-400 leading-relaxed max-w-md">
              Match tracking, calibrated pitch metrics and broadcast tooling for analysts, coaches and
              production teams — all behind one secure session.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-slate-300">
              {[
                "Workspace isolation for every club or broadcaster",
                "Role-based dashboards and audit trail",
                "Upload, share and export match artefacts",
                "Password hashing with scrypt · HttpOnly sessions",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Security first
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Sessions are HttpOnly, SameSite=Lax and origin-checked on every mutation. Passwords are
              hashed with scrypt and never stored in plain text.
            </p>
          </div>
        </aside>

        <main className="flex items-center justify-center px-5 py-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8">
              <Link to="/"><BrandMark size="sm" /></Link>
            </div>

            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 mb-6">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to site
            </Link>

            <h2 className="text-2xl font-black tracking-tight">
              {isSignup ? "Create your workspace" : "Sign in"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <Link to="/login" className="text-cyan-300 hover:text-cyan-200 font-semibold">Sign in</Link>
                </>
              ) : (
                <>
                  New to MatchVision?{" "}
                  <Link to="/signup" className="text-cyan-300 hover:text-cyan-200 font-semibold">Create an account</Link>
                </>
              )}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              {isSignup && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full name">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                      placeholder="Alex Morgan"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Organisation">
                    <input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                      autoComplete="organization"
                      placeholder="North London Analytics"
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}

              <Field label="Work email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@club.com"
                  className={inputClass}
                />
              </Field>

              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    placeholder={isSignup ? "At least 10 characters, letters and numbers" : "Your password"}
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isSignup && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Minimum 10 characters, including at least one letter and one number.
                  </p>
                )}
              </Field>

              {isSignup && (
                <Field label="Primary role">
                  <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                    <option value="analyst">Performance analyst</option>
                    <option value="coach">Coach / tactical staff</option>
                    <option value="broadcaster">Broadcast production</option>
                  </select>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    The first member of a workspace is its administrator and manages access.
                  </p>
                </Field>
              )}

              {error && (
                <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {loading ? "Please wait…" : isSignup ? "Create workspace" : "Sign in"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <p className="mt-6 text-[11px] text-slate-500 leading-relaxed">
              By continuing you agree to our{" "}
              <Link to="/terms" className="text-slate-400 hover:text-white underline underline-offset-2">Terms</Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-slate-400 hover:text-white underline underline-offset-2">Privacy Policy</Link>.
              Need help?{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-slate-400 hover:text-white">{SUPPORT_EMAIL}</a>
            </p>

            <div className="mt-10 lg:hidden">
              <p className="text-[10px] text-slate-600">© {new Date().getFullYear()} {COMPANY}</p>
            </div>
          </div>
        </main>
      </div>
      <div className="hidden lg:block">
        <SiteFooter />
      </div>
    </div>
  );
};
