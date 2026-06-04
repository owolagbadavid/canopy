import jwt from "jsonwebtoken";
import type { CookieOptions, RequestHandler } from "express";
import { env } from "./env";

export const SESSION_COOKIE = "canopy_session";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: SessionUser;
  }
}

export function signSession(user: SessionUser): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: "30d" });
}

export function verifySession(token: string): SessionUser | null {
  try {
    const d = jwt.verify(token, env.jwtSecret);
    if (d && typeof d === "object" && typeof (d as SessionUser).id === "string") {
      return { id: (d as SessionUser).id, email: (d as SessionUser).email };
    }
    return null;
  } catch {
    return null;
  }
}

export function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    maxAge: MAX_AGE_MS,
    path: "/",
  };
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  const user = token ? verifySession(token) : null;
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  req.user = user;
  next();
};
