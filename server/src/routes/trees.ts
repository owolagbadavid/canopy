import { Router } from "express";
import multer from "multer";
import { createHash } from "node:crypto";
import { postForm, WeatherApiError } from "../weatherClient";
import { adaptTreeAnalysis } from "../adapter";
import { cache } from "../cache";
import { recordCacheHit } from "../quota";
import { recordCache } from "../metrics";
import { requireAuth } from "../auth";
import { getLogger } from "../requestContext";
import { SAMPLE_TREE_ANALYSIS } from "../sampleTrees";
import { saveAnalysis } from "./analyses";
import type { TreeAnalysis } from "../types";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    if (!ok) return cb(new Error("Only JPEG, PNG or WEBP images are accepted."));
    cb(null, true);
  },
});

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

router.post("/trees/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "An 'image' file is required (JPEG/PNG/WEBP, max 2 MB)." });
    return;
  }

  // Cache by image content hash — re-uploading the same photo must not burn
  // another of the 5 monthly analyses.
  const key = `trees|${createHash("sha256").update(req.file.buffer).digest("hex").slice(0, 16)}`;
  const cached = await cache.get<TreeAnalysis>(key);
  if (cached) {
    recordCache("hit");
    recordCacheHit();
    res.json({ ...cached, meta: { cached: true } });
    return;
  }
  recordCache("miss");

  const form = new FormData();
  const blob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
  form.append("image", blob, req.file.originalname || "upload.jpg");
  for (const field of ["farmerId", "county", "landAcres", "location", "notes"] as const) {
    const v = req.body?.[field];
    if (typeof v === "string" && v.length > 0) form.append(field, v);
  }

  try {
    const raw = await postForm("/v1/trees/analyze", form);
    const analysis = adaptTreeAnalysis(raw, "live");
    await cache.set(key, analysis, TTL_MS);
    await saveAnalysis(req.user!.id, analysis);
    res.json({ ...analysis, meta: { cached: false } });
  } catch (err) {
    // Graceful degradation: on quota/plan errors return the bundled sample so the
    // demo still shows real output.
    if (err instanceof WeatherApiError && (err.status === 429 || err.status === 403)) {
      const sample = adaptTreeAnalysis(SAMPLE_TREE_ANALYSIS, "sample");
      await saveAnalysis(req.user!.id, sample).catch(() => {});
      res.json({ ...sample, meta: { cached: false, fallbackReason: err.message } });
      return;
    }
    if (err instanceof WeatherApiError) {
      res.status(err.status).json({ error: err.message, status: err.status });
      return;
    }
    getLogger().error({ err: (err as Error).message }, "trees:unexpected");
    res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
