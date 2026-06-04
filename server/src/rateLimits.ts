export const RATE_LIMIT_OVERRIDES: Record<string, { public?: number; auth?: number }> = {
  "POST /api/auth/login": { public: 5 },
  "POST /api/trees/analyze": { auth: 5 },
};
