import React, { useEffect, useState } from "react";
import { Link } from "../lib/router";
import { api, ApiError, type SessionUser, type Usage } from "../lib/api";
import { WorkspaceShell } from "./WorkspaceShell";
import App from "../App";
import { buildArtefact, type LoadedArtefact } from "../services/artefactAdapter";
import { AlertTriangle, Loader2 } from "lucide-react";

interface StudioPageProps {
  user: SessionUser;
  usage?: Usage;
  onLogout: () => void;
  matchId?: string | null;
}

type Status = "loading" | "ready" | "error";

/** Loads a match artefact (if requested) and hands it to the studio for replay. */
export const StudioPage: React.FC<StudioPageProps> = ({ user, usage, onLogout, matchId = null }) => {
  const [artefact, setArtefact] = useState<LoadedArtefact | null>(null);
  const [status, setStatus] = useState<Status>(matchId ? "loading" : "ready");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) {
      setArtefact(null);
      setStatus("ready");
      setError(null);
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(null);

    api.matches
      .get(matchId)
      .then(({ match, payload }) => {
        if (cancelled) return;
        setArtefact(
          buildArtefact(payload, {
            id: match.id,
            title: match.title,
            competition: match.competition,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            playedAt: match.playedAt,
            source: match.source,
            createdAt: match.createdAt,
          })
        );
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not load this match artefact.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return (
    <WorkspaceShell user={user} usage={usage} onLogout={onLogout} active="studio">
      {status === "loading" && (
        <div className="py-28 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading match artefact…
        </div>
      )}

      {status === "error" && (
        <div className="max-w-xl mx-auto px-5 py-24 text-center">
          <span className="mx-auto grid place-items-center w-12 h-12 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-white">Could not open this match</h1>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <Link
            to="/app/library"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400"
          >
            Back to match library
          </Link>
        </div>
      )}

      {status === "ready" && <App key={matchId ?? "demo"} user={user} artefact={artefact} />}
    </WorkspaceShell>
  );
};
