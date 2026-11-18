export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "analyst" | "coach" | "broadcaster" | "admin";
  isAdmin: boolean;
  orgId: string;
  orgName: string;
  plan: "starter" | "club" | "enterprise";
  createdAt: number;
  lastLoginAt: number | null;
}

export interface Usage {
  members: number;
  matches: number;
  limits: { seats: number; matches: number };
}

export interface MatchSummary {
  id: string;
  title: string;
  competition: string | null;
  home_team: string | null;
  away_team: string | null;
  played_at: string | null;
  source: string;
  created_at: number;
  owner_name: string;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });

  let body: any = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error || "request_failed",
      body?.message || `Request failed with status ${response.status}.`
    );
  }
  return body as T;
}

export const api = {
  me: () => request<{ user: SessionUser | null; usage?: Usage }>("/api/auth/me"),

  signup: (input: {
    email: string;
    password: string;
    name: string;
    orgName: string;
    role: string;
  }) => request<{ user: SessionUser }>("/api/auth/signup", { method: "POST", body: JSON.stringify(input) }),

  login: (input: { email: string; password: string }) =>
    request<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify(input) }),

  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  rename: (name: string) =>
    request<{ user: SessionUser }>("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name }) }),

  plans: () => request<{ plans: Plan[] }>("/api/auth/plans"),

  matches: {
    list: () => request<{ matches: MatchSummary[] }>("/api/matches"),
    get: (id: string) =>
      request<{ match: MatchDetail; payload: Record<string, any> }>(`/api/matches/${id}`),
    create: (input: {
      title: string;
      competition?: string | null;
      homeTeam?: string | null;
      awayTeam?: string | null;
      playedAt?: string | null;
      source?: string;
      payload: unknown;
    }) => request<{ theMatch: MatchSummary }>("/api/matches", { method: "POST", body: JSON.stringify(input) }),
    remove: (id: string) => request<{ ok: boolean }>(`/api/matches/${id}`, { method: "DELETE" }),
    exportUrl: (id: string) => `/api/matches/${id}/export`,
  },

  ai: {
    status: () => request<{ configured: boolean; models: Record<string, string> }>("/api/ai/status"),
    tactical: (prompt: string, matchContext: unknown) =>
      request<{ answer: string; model: string; offline?: boolean }>("/api/ai/tactical-query", {
        method: "POST",
        body: JSON.stringify({ prompt, matchContext }),
      }),
    broadcast: (messages: Array<{ role: string; content: string }>, model?: string) =>
      request<{ reply: string; model: string; suggestedGraphic?: unknown }>("/api/ai/broadcast-chat", {
        method: "POST",
        body: JSON.stringify({ messages, model }),
      }),
  },
};

export interface Plan {
  id: "starter" | "club" | "enterprise";
  name: string;
  priceMonthly: number | null;
  currency: string;
  seatLimit: number;
  matchLimit: number;
  features: string[];
}

export interface MatchDetail {
  id: string;
  title: string;
  competition: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  playedAt: string | null;
  source: string;
  createdAt: number;
}

export const FALLBACK_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 149,
    currency: "GBP",
    seatLimit: 2,
    matchLimit: 10,
    features: [
      "2 analyst seats",
      "10 processed matches per month",
      "Pitch calibration & tracking overlays",
      "Event timeline and team shape metrics",
      "JSON export for internal tooling",
    ],
  },
  {
    id: "club",
    name: "Club",
    priceMonthly: 749,
    currency: "GBP",
    seatLimit: 15,
    matchLimit: 100,
    features: [
      "15 seats across analysis and coaching",
      "100 processed matches per month",
      "Studio replay from tracked match timelines",
      "Fatigue, set-piece and scouting workspaces",
      "Broadcast graphics and telestration suite",
      "Role-based dashboards and audit trail",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: null,
    currency: "GBP",
    seatLimit: 200,
    matchLimit: 100000,
    features: [
      "Unlimited seats and match volume",
      "On-premise or private cloud deployment",
      "Live RTSP/RTMP ingest and multi-camera calibration",
      "Custom analytics modules and data retention",
      "SSO, DPA and security review support",
      "Dedicated solutions engineer",
    ],
  },
];
