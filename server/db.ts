import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type UserRole = "analyst" | "coach" | "broadcaster" | "admin";

export interface DbUser {
  id: string;
  org_id: string;
  email: string;
  name: string;
  role: UserRole;
  is_admin: number;
  password_hash: string;
  password_salt: string;
  created_at: number;
  last_login_at: number | null;
}

export interface DbOrg {
  id: string;
  name: string;
  plan: "starter" | "club" | "enterprise";
  created_at: number;
}

export interface DbSession {
  id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
  last_seen_at: number;
  user_agent: string | null;
}

export interface DbMatch {
  id: string;
  org_id: string;
  owner_id: string;
  title: string;
  competition: string | null;
  home_team: string | null;
  away_team: string | null;
  played_at: string | null;
  source: string;
  payload_json: string;
  created_at: number;
}

export interface DbMatchSummary {
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

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

let db: DatabaseSync | null = null;

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString("base64url")}`;
}

export function databasePath(): string {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "matchvision.db");
}

export function initDb(): DatabaseSync {
  if (db) return db;

  const file = databasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS orgs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'starter',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'analyst',
      is_admin INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_login_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      competition TEXT,
      home_team TEXT,
      away_team TEXT,
      played_at TEXT,
      source TEXT NOT NULL DEFAULT 'pipeline',
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL,
      meta_json TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_matches_org ON matches(org_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_events(org_id, created_at DESC);
  `);

  purgeExpiredSessions();
  return db;
}

export function getDb(): DatabaseSync {
  if (!db) return initDb();
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ------------------------------------------------------------------ orgs/users
export function createOrg(name: string, plan: DbOrg["plan"] = "starter"): DbOrg {
  const org: DbOrg = { id: newId("org"), name, plan, created_at: Date.now() };
  getDb()
    .prepare("INSERT INTO orgs (id, name, plan, created_at) VALUES (?, ?, ?, ?)")
    .run(org.id, org.name, org.plan, org.created_at);
  return org;
}

export function findOrgById(id: string): DbOrg | null {
  return (getDb().prepare("SELECT * FROM orgs WHERE id = ?").get(id) as DbOrg | undefined) ?? null;
}

export function setOrgPlan(orgId: string, plan: DbOrg["plan"]): void {
  getDb().prepare("UPDATE orgs SET plan = ? WHERE id = ?").run(plan, orgId);
}

export function createUser(input: {
  orgId: string;
  email: string;
  name: string;
  role: UserRole;
  isAdmin?: boolean;
  passwordHash: string;
  passwordSalt: string;
}): DbUser {
  const user: DbUser = {
    id: newId("usr"),
    org_id: input.orgId,
    email: input.email.toLowerCase(),
    name: input.name,
    role: input.role,
    is_admin: input.isAdmin ? 1 : 0,
    password_hash: input.passwordHash,
    password_salt: input.passwordSalt,
    created_at: Date.now(),
    last_login_at: null,
  };
  getDb()
    .prepare(
      `INSERT INTO users (id, org_id, email, name, role, is_admin, password_hash, password_salt, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      user.org_id,
      user.email,
      user.name,
      user.role,
      user.is_admin,
      user.password_hash,
      user.password_salt,
      user.created_at,
      null
    );
  return user;
}

export function findUserByEmail(email: string): DbUser | null {
  return (
    (getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as
      | DbUser
      | undefined) ?? null
  );
}

export function findUserById(id: string): DbUser | null {
  return (getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined) ?? null;
}

export function updateUserName(userId: string, name: string): void {
  getDb().prepare("UPDATE users SET name = ? WHERE id = ?").run(name, userId);
}

export function touchLogin(userId: string): void {
  getDb().prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(Date.now(), userId);
}

export function countOrgMembers(orgId: string): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE org_id = ?").get(orgId) as
    | { n: number }
    | undefined;
  return row?.n ?? 0;
}

// ------------------------------------------------------------------- sessions
export function createSession(userId: string, userAgent: string | null): DbSession {
  const now = Date.now();
  const session: DbSession = {
    id: crypto.randomBytes(32).toString("base64url"),
    user_id: userId,
    created_at: now,
    expires_at: now + SESSION_TTL_MS,
    last_seen_at: now,
    user_agent: userAgent,
  };
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      session.id,
      session.user_id,
      session.created_at,
      session.expires_at,
      session.last_seen_at,
      session.user_agent
    );
  return session;
}

export function findSession(id: string): DbSession | null {
  return (getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as DbSession | undefined) ?? null;
}

// --------------------------------------------------------------------- matches
export function createMatch(input: {
  orgId: string;
  ownerId: string;
  title: string;
  competition?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  playedAt?: string | null;
  source: string;
  payload: unknown;
}): DbMatch {
  const match: DbMatch = {
    id: newId("match"),
    org_id: input.orgId,
    owner_id: input.ownerId,
    title: input.title.slice(0, 160),
    competition: input.competition?.slice(0, 120) ?? null,
    home_team: input.homeTeam?.slice(0, 120) ?? null,
    away_team: input.awayTeam?.slice(0, 120) ?? null,
    played_at: input.playedAt?.slice(0, 40) ?? null,
    source: input.source.slice(0, 40),
    payload_json: JSON.stringify(input.payload),
    created_at: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO matches (id, org_id, owner_id, title, competition, home_team, away_team, played_at, source, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      match.id,
      match.org_id,
      match.owner_id,
      match.title,
      match.competition,
      match.home_team,
      match.away_team,
      match.played_at,
      match.source,
      match.payload_json,
      match.created_at
    );
  return match;
}

export function listMatches(orgId: string, limit = 100): DbMatchSummary[] {
  return getDb()
    .prepare(
      `SELECT m.id, m.title, m.competition, m.home_team, m.away_team, m.played_at, m.source,
              m.created_at, u.name AS owner_name
         FROM matches m
         JOIN users u ON u.id = m.owner_id
        WHERE m.org_id = ?
        ORDER BY m.created_at DESC
        LIMIT ?`
    )
    .all(orgId, limit) as unknown as DbMatchSummary[];
}

export function getMatch(orgId: string, id: string): DbMatch | null {
  return (
    (getDb().prepare("SELECT * FROM matches WHERE org_id = ? AND id = ?").get(orgId, id) as
      | DbMatch
      | undefined) ?? null
  );
}

export function deleteMatch(orgId: string, id: string): boolean {
  const result = getDb().prepare("DELETE FROM matches WHERE org_id = ? AND id = ?").run(orgId, id);
  return Number(result.changes) > 0;
}

export function countMatches(orgId: string): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM matches WHERE org_id = ?").get(orgId) as
    | { n: number }
    | undefined;
  return row?.n ?? 0;
}

// ------------------------------------------------------------------------ audit
export function audit(
  action: string,
  meta: Record<string, unknown> | null,
  orgId: string | null,
  userId: string | null
): void {
  getDb()
    .prepare("INSERT INTO audit_events (org_id, user_id, action, meta_json, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(orgId, userId, action, meta ? JSON.stringify(meta) : null, Date.now());
}

export function listAudit(orgId: string, limit = 50): Array<Record<string, unknown>> {
  return getDb()
    .prepare(
      `SELECT id, user_id, action, meta_json, created_at FROM audit_events
        WHERE org_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(orgId, limit) as unknown as Array<Record<string, unknown>>;
}

export function touchSession(id: string): void {
  getDb().prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(Date.now(), id);
}

export function deleteSession(id: string): void {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function deleteOtherSessions(userId: string, keepSessionId: string): void {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ? AND id <> ?").run(userId, keepSessionId);
}

export function purgeExpiredSessions(): void {
  getDb().prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
}

