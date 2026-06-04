import { Router } from "express";
import { getDb } from "../db";
import { requireAuth } from "../auth";
import type { TreeAnalysis } from "../types";

const router = Router();
router.use(requireAuth);

// Persist a tree-analysis result to the user's history. Called by the trees route.
export async function saveAnalysis(userId: string, a: TreeAnalysis): Promise<void> {
  await getDb().collection("analyses").insertOne({
    userId,
    createdAt: new Date(),
    totalTreeCount: a.totalTreeCount,
    treeDensityPerAcre: a.treeDensityPerAcre,
    canopyCoveragePct: a.canopyCoveragePct,
    confidenceScore: a.confidenceScore,
    source: a.source,
  });
}

router.get("/analyses", async (req, res) => {
  const docs = await getDb()
    .collection("analyses")
    .find({ userId: req.user!.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  res.json(
    docs.map((d) => ({
      id: String(d._id),
      createdAt: d.createdAt,
      totalTreeCount: d.totalTreeCount,
      treeDensityPerAcre: d.treeDensityPerAcre,
      canopyCoveragePct: d.canopyCoveragePct,
      confidenceScore: d.confidenceScore,
      source: d.source,
    })),
  );
});

export default router;
