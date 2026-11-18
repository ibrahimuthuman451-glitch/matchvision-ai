import React, { useEffect, useState } from "react";
import { Link, navigate } from "../lib/router";
import { api, ApiError, type MatchSummary, type SessionUser, type Usage } from "../lib/api";
import { WorkspaceShell } from "./WorkspaceShell";
import { AlertTriangle, ArrowRight, Download, Loader2, Play, Plus, Trash2, UploadCloud, X } from "lucide-react";

interface MatchLibraryProps {
  user: SessionUser;
  usage?: Usage;
  onLogout: () => void;
  refreshSession: () => void;
}

const formatDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export const MatchLibrary: React.FC<MatchLibraryProps> = ({ user, usage, onLogout, refreshSession }) => {
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.matches.list();
      setMatches(data.matches);
    } catch (err) {
      setMatches([]);
      setError(err instanceof ApiError ? err.message : "Could not load the match library.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete “${title}”? This removes the stored artefact and cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.matches.remove(id);
      setMatches((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
      refreshSession();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the match.");
    } finally {
      setDeleting(null);
    }
  };

  const atLimit = usage ? usage.matches >= usage.limits.matches : false;

  return (
    <WorkspaceShell user={user} usage={usage} onLogout={onLogout} active="library">
      <div className="mx-auto max-w-6xl px-5 lg:px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Match library</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Upload a match artefact exported by the MatchVision pipeline. Reports are shared with
              everyone in <span className="text-slate-200">{user.orgName}</span>.
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            disabled={atLimit}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" /> Upload match artefact
          </button>
        </div>

        {atLimit && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              You have reached the {usage?.limits.matches} match limit for the {user.plan} plan.{" "}
              <Link to="/pricing" className="underline underline-offset-2 font-semibold">Compare plans</Link>{" "}
              to store more matches.
            </span>
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {matches === null ? (
          <div className="mt-16 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading library…
          </div>
        ) : matches.length === 0 ? (
          <EmptyLibrary onUpload={() => setShowUpload(true)} />
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/50">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Match</th>
                  <th className="hidden md:table-cell px-4 py-3 font-bold">Competition</th>
                  <th className="hidden lg:table-cell px-4 py-3 font-bold">Uploaded</th>
                  <th className="hidden lg:table-cell px-4 py-3 font-bold">By</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {matches.map((match) => (
                  <tr key={match.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/app/matches/${match.id}`)} className="text-left group">
                        <span className="block font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {match.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-500 font-mono">
                          {[match.home_team, match.away_team].filter(Boolean).join(" vs ") || match.source}
                          {match.played_at ? ` · ${match.played_at}` : ""}
                        </span>
                      </button>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-slate-400">{match.competition || "—"}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDate(match.created_at)}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-slate-400">{match.owner_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/app/studio/${match.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2 py-1.5 text-[11px] font-bold text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/20"
                          title="Open in studio replay"
                        >
                          <Play className="w-3.5 h-3.5" /> Studio
                        </button>
                        <button
                          onClick={() => navigate(`/app/matches/${match.id}`)}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                          title="Open report"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <a
                          href={api.matches.exportUrl(match.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                          title="Download artefact"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => remove(match.id, match.title)}
                          disabled={deleting === match.id}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                          title="Delete match"
                        >
                          {deleting === match.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadDialog
          onClose={() => setShowUpload(false)}
          onCreated={() => {
            setShowUpload(false);
            refreshSession();
            load();
          }}
        />
      )}
    </WorkspaceShell>
  );
};


const EmptyLibrary: React.FC<{ onUpload: () => void }> = ({ onUpload }) => (
  <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-10 text-center">
    <span className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-300 border border-cyan-400/20">
      <FolderOpenIcon />
    </span>
    <h2 className="mt-5 text-lg font-bold text-white">No match artefacts yet</h2>
    <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
      Generate a demo match locally, then upload the exported JSON. The demo runs without a video
      file or YOLO weights.
    </p>
    <div className="mt-5 mx-auto max-w-xl rounded-xl border border-white/10 bg-slate-950 p-4 text-left font-mono text-[11px] text-cyan-300 overflow-x-auto">
      <p className="text-slate-500">$ python main.py --mode demo --export-json demo_match.json</p>
    </div>
    <button
      onClick={onUpload}
      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors"
    >
      <Plus className="w-4 h-4" /> Upload match artefact
    </button>
  </div>
);

const FolderOpenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);

const UploadDialog: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Record<string, any> | null>(null);
  const [title, setTitle] = useState("");
  const [competition, setCompetition] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [playedAt, setPlayedAt] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const readFile = async (selected: File) => {
    setError(null);
    if (selected.size > 8 * 1024 * 1024) {
      setError("Artefact is larger than 8 MB. Trim the payload or contact support.");
      return;
    }
    try {
      const text = await selected.text();
      const json = JSON.parse(text);
      if (!json || typeof json !== "object" || Array.isArray(json)) {
        setError("Expected a JSON object exported by the MatchVision pipeline.");
        return;
      }
      setFile(selected);
      setParsed(json);
      if (!title) {
        const videoName = String(json?.video?.input || "").split(/[\\/]/).pop() || "";
        const guessed = videoName.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
        setTitle(guessed || selected.name.replace(/\.json$/i, "").replace(/[_-]+/g, " "));
      }
    } catch {
      setError("That file is not valid JSON.");
    }
  };


  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!parsed) {
      setError("Choose a match artefact to upload.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.matches.create({
        title: title || "Untitled match",
        competition: competition || null,
        homeTeam: homeTeam || null,
        awayTeam: awayTeam || null,
        playedAt: playedAt || null,
        source: "pipeline",
        payload: parsed,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-white">Upload match artefact</h2>
            <p className="text-[11px] text-slate-500">matchvision.match.v1 JSON from the pipeline export</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) readFile(dropped);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors ${
              dragging ? "border-cyan-400/60 bg-cyan-400/5" : "border-white/10 bg-slate-950/50 hover:border-cyan-400/40"
            }`}
          >
            <UploadCloud className="w-6 h-6 text-cyan-300" />
            <span className="text-sm font-semibold text-slate-200">
              {file ? file.name : "Drop the exported JSON here"}
            </span>
            <span className="text-[11px] text-slate-500">
              {parsed
                ? `${Array.isArray(parsed.players) ? parsed.players.length : 0} players · ${
                    Array.isArray(parsed.events) ? parsed.events.length : 0
                  } events detected`
                : "or click to browse · max 8 MB"}
            </span>
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) readFile(selected);
              }}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <LabeledInput label="Match title" value={title} onChange={setTitle} placeholder="Arsenal vs Manchester City" required />
            <LabeledInput label="Competition" value={competition} onChange={setCompetition} placeholder="Premier League" />
            <LabeledInput label="Home team" value={homeTeam} onChange={setHomeTeam} placeholder="Arsenal" />
            <LabeledInput label="Away team" value={awayTeam} onChange={setAwayTeam} placeholder="Manchester City" />
            <LabeledInput label="Played on" value={playedAt} onChange={setPlayedAt} placeholder="2026-10-14" />
          </div>

          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !parsed}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save match
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LabeledInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}> = ({ label, value, onChange, placeholder, required }) => (
  <label className="block">
    <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
    />
  </label>
);
