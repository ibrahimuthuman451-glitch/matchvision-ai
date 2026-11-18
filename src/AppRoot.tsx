import React, { useCallback, useEffect, useState } from "react";
import { api, type SessionUser, type Usage } from "./lib/api";
import { Link, navigate, useRoute } from "./lib/router";
import { Landing } from "./pages/Landing";
import { AuthPage } from "./pages/AuthPage";
import { Loader2 } from "lucide-react";

// Secondary surfaces are code-split so the public landing page stays light.
const StudioPage = React.lazy(() =>
  import("./pages/StudioPage").then((m) => ({ default: m.StudioPage }))
);
const MatchLibrary = React.lazy(() =>
  import("./pages/MatchLibrary").then((m) => ({ default: m.MatchLibrary }))
);
const MatchReport = React.lazy(() =>
  import("./pages/MatchReport").then((m) => ({ default: m.MatchReport }))
);
const PricingPage = React.lazy(() =>
  import("./pages/ContentPages").then((m) => ({ default: m.PricingPage }))
);
const SecurityPage = React.lazy(() =>
  import("./pages/ContentPages").then((m) => ({ default: m.SecurityPage }))
);
const LegalPage = React.lazy(() =>
  import("./pages/ContentPages").then((m) => ({ default: m.LegalPage }))
);

interface SessionState {
  user: SessionUser | null;
  usage?: Usage;
}

export const BootScreen: React.FC = () => (
  <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-400">
    <div className="flex items-center gap-2 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading MatchVision…
    </div>
  </div>
);

const NotFound: React.FC = () => (
  <div className="min-h-screen grid place-items-center bg-slate-950 px-6 text-center">
    <div>
      <p className="text-xs font-mono uppercase tracking-widest text-cyan-400">404</p>
      <h1 className="mt-3 text-3xl font-black text-white">That page does not exist</h1>
      <p className="mt-3 text-sm text-slate-400">Check the address, or head back to the product site.</p>
      <Link to="/" className="mt-6 inline-flex rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400">
        Back to home
      </Link>
    </div>
  </div>
);

export const Root: React.FC = () => {
  const route = useRoute();
  const [session, setSession] = useState<SessionState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.me();
      setSession({ user: data.user, usage: data.usage });
    } catch {
      setSession({ user: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onAuthenticated = (user: SessionUser) => {
    setSession({ user });
    void refresh();
  };

  const onLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* session may already be gone */
    }
    setSession({ user: null });
    navigate("/login", { replace: true });
  };

  if (session === null) return <BootScreen />;

  const path = route.split("?")[0];
  const user = session.user;

  // Already signed in? Skip the auth screens.
  if ((path === "/login" || path === "/signup") && user) {
    return <StudioPage user={user} usage={session.usage} onLogout={onLogout} />;
  }

  if (path.startsWith("/app")) {
    if (!user) {
      return (
        <div className="min-h-screen bg-slate-950">
          <AuthPage mode="login" onAuthenticated={onAuthenticated} />
        </div>
      );
    }

    if (path === "/app/library") {
      return (
        <MatchLibrary
          user={user}
          usage={session.usage}
          onLogout={onLogout}
          refreshSession={refresh}
        />
      );
    }

    const match = path.match(/^\/app\/matches\/([^/]+)$/);
    if (match) {
      return <MatchReport matchId={match[1]} user={user} usage={session.usage} onLogout={onLogout} />;
    }

    const studio = path.match(/^\/app\/studio\/([^/]+)$/);
    if (studio) {
      return (
        <StudioPage
          matchId={studio[1]}
          user={user}
          usage={session.usage}
          onLogout={onLogout}
        />
      );
    }

    return <StudioPage user={user} usage={session.usage} onLogout={onLogout} />;
  }

  switch (path) {
    case "/":
      return <Landing />;
    case "/pricing":
      return <PricingPage />;
    case "/security":
      return <SecurityPage />;
    case "/privacy":
      return <LegalPage kind="privacy" />;
    case "/terms":
      return <LegalPage kind="terms" />;
    case "/login":
      return <AuthPage mode="login" onAuthenticated={onAuthenticated} />;
    case "/signup":
      return <AuthPage mode="signup" onAuthenticated={onAuthenticated} />;
    default:
      return <NotFound />;
  }
};
