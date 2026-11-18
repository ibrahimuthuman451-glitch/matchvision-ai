import React, { useEffect, useState } from "react";
import { Link } from "../lib/router";
import { SiteShell, SUPPORT_EMAIL, COMPANY } from "./SiteChrome";
import { api, FALLBACK_PLANS, type Plan } from "../lib/api";
import { ArrowRight, CheckCircle2, FileText, Lock, Server, ShieldCheck, Trash2, Users } from "lucide-react";

const PageHeader: React.FC<{ eyebrow: string; title: string; intro: string }> = ({ eyebrow, title, intro }) => (
  <div className="relative overflow-hidden border-b border-white/5">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(6,182,212,0.14),_transparent_60%)]" />
    <div className="relative mx-auto max-w-5xl px-5 lg:px-8 py-16">
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">{eyebrow}</span>
      <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">{title}</h1>
      <p className="mt-4 max-w-3xl text-slate-400 leading-relaxed">{intro}</p>
    </div>
  </div>
);

export const PricingPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);

  useEffect(() => {
    api.plans().then((data) => setPlans(data.plans)).catch(() => setPlans(FALLBACK_PLANS));
  }, []);

  return (
    <SiteShell active="pricing">
      <PageHeader
        eyebrow="Pricing"
        title="Transparent plans for football operations"
        intro="Start with the analyst workspace, scale into coaching and broadcast workflows, or deploy the full platform inside your own infrastructure. Every plan includes the calibrated tracking engine and the match library."
      />

      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-14">
        <div className="grid gap-5 lg:grid-cols-3">
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
                <h2 className="text-lg font-bold text-white">{plan.name}</h2>
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

        <div className="mt-8 rounded-2xl border border-white/5 bg-slate-900/40 p-6">
          <h3 className="text-sm font-bold text-white">What every plan includes</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm text-slate-300">
            {[
              "Pitch homography calibration with degraded-mode signalling",
              "Persistent tracking and team clustering",
              "Match library with JSON import/export",
              "Secure workspace sessions and audit trail",
            ].map((item) => (
              <p key={item} className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                {item}
              </p>
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Prices exclude VAT. Need procurement paperwork, a DPA or a security questionnaire?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyan-300 hover:text-cyan-200">{SUPPORT_EMAIL}</a>
        </p>
      </section>
    </SiteShell>
  );
};

export const SecurityPage: React.FC = () => (
  <SiteShell active="security">
    <PageHeader
      eyebrow="Security & trust"
      title="Built for club and broadcaster security reviews"
      intro="MatchVision handles tactical performance data. The web application is designed around workspace isolation, minimal data retention and auditable access, with a deployment model that keeps video on your infrastructure."
    />

    <section className="mx-auto max-w-5xl px-5 lg:px-8 py-14 space-y-5">
      {[
        {
          icon: Lock,
          title: "Authentication and sessions",
          body: "Passwords are hashed with scrypt using per-user salts. Sessions are random 256-bit tokens stored server-side, delivered as HttpOnly, SameSite=Lax cookies with a seven-day sliding expiry. Signing out invalidates the server-side session immediately.",
        },
        {
          icon: ShieldCheck,
          title: "Request hardening",
          body: "State-changing requests are origin-checked, JSON bodies are size-limited, and every response carries nosniff, frame-deny, referrer and permissions-policy headers. In production the app also sends HSTS and a strict Content-Security-Policy.",
        },
        {
          icon: Users,
          title: "Workspace isolation and access control",
          body: "Every match artefact belongs to a single organisation. Queries are scoped by the session's organisation, so one workspace can never read another's matches. Administrative actions and match changes are written to an audit log.",
        },
        {
          icon: Trash2,
          title: "Data retention",
          body: "The workspace stores match JSON artefacts, account records and audit entries. Video is never uploaded — the CV engine exports structured data locally. Deleting a match removes its payload from the database immediately.",
        },
        {
          icon: Server,
          title: "Deployment options",
          body: "The web service ships as a single container with a SQLite database on a mounted volume. Enterprise deployments can run fully on-premise or in a private cloud, with the CV engine executed on club-managed hardware.",
        },
        {
          icon: FileText,
          title: "Third parties",
          body: "Generative analysis and broadcast copy are optional. When configured, prompts and the match context you submit are sent to the Google Gemini API. With no API key set, the product operates fully offline using deterministic rules.",
        },
      ].map((card) => (
        <article key={card.title} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
          <div className="flex items-start gap-4">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 shrink-0">
              <card.icon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{card.body}</p>
            </div>
          </div>
        </article>
      ))}

      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-6">
        <h2 className="text-base font-bold text-white">Reporting a vulnerability</h2>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          Email{" "}
          <a href="mailto:security@matchvision.ai" className="text-cyan-300 hover:text-cyan-200">security@matchvision.ai</a>{" "}
          with reproduction steps. We acknowledge reports within two business days and will coordinate disclosure with you.
        </p>
      </div>
    </section>
  </SiteShell>
);


const LEGAL: Record<"privacy" | "terms", { title: string; intro: string; sections: Array<{ heading: string; body: string[] }> }> = {
  privacy: {
    title: "Privacy Policy",
    intro: "This policy explains what MatchVision stores, why we store it and the choices available to your organisation.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account data: name, work email, organisation, role and a scrypt password hash. We never store plain-text passwords.",
          "Workspace content: match artefacts you upload (players, events, team metrics) and audit records of account and match actions.",
          "Operational logs: request method, path, status code and duration. Request bodies, cookies and match payloads are not logged.",
        ],
      },
      {
        heading: "What we do not collect",
        body: [
          "Match video. The computer vision engine runs on your infrastructure and exports structured JSON only.",
          "Biometric identity templates. Tracking identifiers are per-match numeric IDs, not facial recognition signatures.",
        ],
      },
      {
        heading: "How data is processed",
        body: [
          "Data is stored in a SQLite database controlled by your deployment. Workspace queries are scoped to your organisation.",
          "If a Gemini API key is configured, the prompts and match context you submit are sent to Google for generative analysis. Disable the key to keep the product fully offline.",
        ],
      },
      {
        heading: "Retention and deletion",
        body: [
          "Match artefacts remain until you delete them or your workspace is removed. Audit records are retained to support security investigations.",
          "You can request workspace deletion by contacting us; we remove account records, sessions, matches and audit entries associated with the workspace.",
        ],
      },
      {
        heading: "Contact",
        body: [`Questions about this policy can be sent to ${SUPPORT_EMAIL}.`],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    intro: "These terms govern use of the MatchVision AI web workspace. Have counsel review them before selling to customers.",
    sections: [
      {
        heading: "Accounts and workspaces",
        body: [
          "You must provide accurate account details and keep credentials confidential. The first member of a workspace is its administrator.",
          "You are responsible for activity performed under your workspace and for ensuring you have the right to process any match data you upload.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not upload unlawful content, attempt to access another workspace, or use the service to build a competing dataset from restricted footage.",
          "Do not probe, scan or load-test the service without written permission.",
        ],
      },
      {
        heading: "Availability and support",
        body: [
          "We aim to keep the service available but do not guarantee uninterrupted access. Planned maintenance is announced in advance where possible.",
          "Support response targets are defined in your order form or plan description.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "You retain ownership of match artefacts you upload. We retain ownership of the MatchVision software, models and documentation.",
          "Analysis outputs may be used freely within your organisation for football operations.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "The service is a decision-support tool. Tactical, medical and performance decisions remain the responsibility of your staff.",
          `To the extent permitted by law, our aggregate liability is limited to the fees paid in the twelve months preceding a claim. Questions: ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
};

export const LegalPage: React.FC<{ kind: "privacy" | "terms" }> = ({ kind }) => {
  const doc = LEGAL[kind];
  return (
    <SiteShell>
      <PageHeader eyebrow="Legal" title={doc.title} intro={doc.intro} />
      <section className="mx-auto max-w-3xl px-5 lg:px-8 py-14 space-y-8">
        <p className="text-xs text-slate-500 font-mono">Last updated: {new Date().toISOString().slice(0, 10)}</p>
        {doc.sections.map((section) => (
          <article key={section.heading}>
            <h2 className="text-lg font-bold text-white">{section.heading}</h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm text-slate-400 leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
        <p className="text-xs text-slate-500 border-t border-white/5 pt-6">
          © {new Date().getFullYear()} {COMPANY}. Contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyan-300 hover:text-cyan-200">{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </SiteShell>
  );
};
