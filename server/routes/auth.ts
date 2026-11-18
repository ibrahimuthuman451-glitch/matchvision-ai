import { Router } from "express";
import {
  audit,
  countMatches,
  countOrgMembers,
  createOrg,
  createUser,
  deleteSession,
  findOrgById,
  findUserByEmail,
  touchLogin,
  updateUserName,
  type DbOrg,
  type UserRole,
} from "../db.ts";
import {
  currentUser,
  endSession,
  hashPassword,
  passwordProblem,
  publicUser,
  requireAuth,
  startSession,
  verifyPassword,
} from "../auth.ts";
import { asEmail, asString, asyncHandler, badRequest, HttpError } from "../http.ts";
import { rateLimit } from "../security.ts";

export const authRouter = Router();

const SIGNUP_ROLES: UserRole[] = ["analyst", "coach", "broadcaster"];
const PARSE_LIMIT = { windowMs: 15 * 60_000, max: 20, name: "auth" };

export const PLANS = [
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
] as const;

export const PLAN_LIMITS: Record<DbOrg["plan"], { seats: number; matches: number }> = {
  starter: { seats: 2, matches: 10 },
  club: { seats: 15, matches: 100 },
  enterprise: { seats: 200, matches: 100000 },
};

authRouter.get("/plans", (_req, res) => {
  res.json({ plans: PLANS });
});

authRouter.post(
  "/signup",
  rateLimit(PARSE_LIMIT),
  asyncHandler(async (req, res) => {
    const email = asEmail(req.body?.email);
    const name = asString(req.body?.name, "Full name", 80);
    const orgName = asString(req.body?.orgName, "Organisation name", 80);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const requestedRole = String(req.body?.role || "analyst") as UserRole;
    const role = SIGNUP_ROLES.includes(requestedRole) ? requestedRole : "analyst";

    const policy = passwordProblem(password);
    if (policy) throw badRequest(policy, "weak_password");

    if (findUserByEmail(email)) {
      throw new HttpError(409, "email_taken", "An account with that email already exists.");
    }

    const org = createOrg(orgName, "starter");
    const { hash, salt } = hashPassword(password);
    const user = createUser({
      orgId: org.id,
      email,
      name,
      role,
      isAdmin: true,
      passwordHash: hash,
      passwordSalt: salt,
    });

    startSession(user, req, res);
    touchLogin(user.id);
    audit("auth.signup", { email, orgName }, org.id, user.id);

    res.status(201).json({ user: publicUser(user, org) });
  })
);

authRouter.post(
  "/login",
  rateLimit(PARSE_LIMIT),
  asyncHandler(async (req, res) => {
    const email = asEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!password) throw badRequest("Password is required.");

    const user = findUserByEmail(email);
    // Constant-ish response for unknown users and wrong passwords
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      throw new HttpError(401, "invalid_credentials", "Email or password is incorrect.");
    }

    const org = findOrgById(user.org_id);
    if (!org) throw new HttpError(403, "org_missing", "Workspace is unavailable. Contact support.");

    // Rotate the session on login to prevent fixation
    const existingSession = res.locals.sessionId as string | undefined;
    if (existingSession) deleteSession(existingSession);

    startSession(user, req, res);
    touchLogin(user.id);
    audit("auth.login", { email }, org.id, user.id);

    res.json({ user: publicUser(user, org) });
  })
);

authRouter.post("/logout", requireAuth, (req, res) => {
  const user = currentUser(res);
  endSession(res);
  audit("auth.logout", null, user.orgId, user.id);
  res.json({ ok: true });
});

authRouter.get("/me", asyncHandler(async (_req, res) => {
  const user = res.locals.user;
  if (!user) {
    res.json({ user: null });
    return;
  }
  res.json({
    user,
    usage: {
      members: countOrgMembers(user.orgId),
      matches: countMatches(user.orgId),
      limits: PLAN_LIMITS[user.plan as DbOrg["plan"]],
    },
  });
}));

authRouter.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(res);
    const name = asString(req.body?.name, "Full name", 80);
    updateUserName(user.id, name);
    audit("account.rename", { name }, user.orgId, user.id);
    res.json({ user: { ...user, name } });
  })
);
