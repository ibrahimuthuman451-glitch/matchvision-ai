import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import {
  createSession,
  deleteSession,
  findOrgById,
  findSession,
  findUserById,
  purgeExpiredSessions,
  touchSession,
  type DbOrg,
  type DbUser,
  type UserRole,
} from "./db.ts";

export const SESSION_COOKIE = "mv_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isAdmin: boolean;
  orgId: string;
  orgName: string;
  plan: DbOrg["plan"];
  createdAt: number;
  lastLoginAt: number | null;
}

export function publicUser(user: DbUser, org: DbOrg): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isAdmin: user.is_admin === 1,
    orgId: org.id,
    orgName: org.name,
    plan: org.plan,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
  };
}

// ------------------------------------------------------------------- passwords
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password.normalize("NFKC"), usedSalt, 64).toString("hex");
  return { hash, salt: usedSalt };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = crypto.scryptSync(password.normalize("NFKC"), salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function passwordProblem(password: string): string | null {
  if (typeof password !== "string" || password.length < 10) {
    return "Password must be at least 10 characters long.";
  }
  if (password.length > 200) return "Password is too long.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

// --------------------------------------------------------------------- cookies
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function cookieFlags(): string {
  const secure = process.env.COOKIE_SECURE === "true";
  return `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function setSessionCookie(res: Response, sessionId: string): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; ${cookieFlags()}; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000
    )}`
  );
}

export function clearSessionCookie(res: Response): void {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; ${cookieFlags()}; Max-Age=0`);
}

// ------------------------------------------------------------------ middleware
export function attachSession(req: Request, res: Response, next: NextFunction): void {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) {
    next();
    return;
  }

  const session = findSession(token);
  if (!session || session.expires_at < Date.now()) {
    if (session) deleteSession(session.id);
    clearSessionCookie(res);
    next();
    return;
  }

  const user = findUserById(session.user_id);
  const org = user ? findOrgById(user.org_id) : null;
  if (!user || !org) {
    deleteSession(session.id);
    clearSessionCookie(res);
    next();
    return;
  }

  // Sliding expiry, refreshed at most once a minute to avoid write amplification
  if (Date.now() - session.last_seen_at > 60_000) {
    touchSession(session.id);
  }

  res.locals.sessionId = session.id;
  res.locals.user = publicUser(user, org);
  next();
}

export function currentUser(res: Response): SessionUser {
  return res.locals.user as SessionUser;
}

export function requireAuth(_req: Request, res: Response, next: NextFunction): void {
  if (!res.locals.user) {
    res.status(401).json({ error: "authentication_required", message: "Please sign in to continue." });
    return;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.user as SessionUser | undefined;
    if (!user) {
      res.status(401).json({ error: "authentication_required", message: "Please sign in to continue." });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "forbidden", message: "Your role cannot perform this action." });
      return;
    }
    next();
  };
}

/**
 * Defence-in-depth CSRF protection: the session cookie is SameSite=Lax, and any
 * state-changing request must come from our own origin.
 */
export function requireSameOrigin(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  const origin = req.get("origin");
  const referer = req.get("referer");
  const host = req.get("host");
  if (!origin && !referer) {
    // Non-browser clients (curl, CI) omit both headers; they still need a session cookie.
    next();
    return;
  }
  const source = origin || referer || "";
  try {
    const url = new URL(source);
    if (url.host === host) {
      next();
      return;
    }
  } catch {
    /* fall through to rejection */
  }
  res.status(403).json({ error: "invalid_origin", message: "Request origin is not allowed." });
}

export function startSession(user: DbUser, req: Request, res: Response): string {
  purgeExpiredSessions();
  const session = createSession(user.id, req.get("user-agent")?.slice(0, 255) ?? null);
  setSessionCookie(res, session.id);
  return session.id;
}

export function endSession(res: Response): void {
  const sessionId = res.locals.sessionId as string | undefined;
  if (sessionId) deleteSession(sessionId);
  clearSessionCookie(res);
}

