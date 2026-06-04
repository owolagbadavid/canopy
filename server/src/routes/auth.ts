import { Router } from "express";
import { getDb, mongoReady } from "../db";
import { cookieOptions, requireAuth, signSession, SESSION_COOKIE } from "../auth";
import { getLogger } from "../requestContext";

const router = Router();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// POST /api/auth/login { email } — passwordless identify: upsert the user and
// issue a JWT session cookie. No verification (per the chosen flow).
router.post("/auth/login", async (req, res) => {
  if (!mongoReady()) {
    res.status(503).json({ error: "Login is unavailable: the database is not configured." });
    return;
  }
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }

  const now = new Date();
  const doc = await getDb()
    .collection("users")
    .findOneAndUpdate(
      { email },
      { $set: { email, lastLoginAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: "after" },
    );
  if (!doc) {
    res.status(500).json({ error: "Could not create the session." });
    return;
  }

  const user = { id: String(doc._id), email };
  res.cookie(SESSION_COOKIE, signSession(user), cookieOptions());
  getLogger().info({ email }, "auth:login");
  res.json({ user });
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
