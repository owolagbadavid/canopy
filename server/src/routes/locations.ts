import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { requireAuth } from "../auth";

const router = Router();
router.use(requireAuth);

// Saved "farms" for the logged-in user (replaces the old hard-coded presets).
router.get("/locations", async (req, res) => {
  const docs = await getDb()
    .collection("locations")
    .find({ userId: req.user!.id })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(docs.map((d) => ({ id: String(d._id), name: d.name, lat: d.lat, lon: d.lon })));
});

router.post("/locations", async (req, res) => {
  const la = Number(req.body?.lat);
  const lo = Number(req.body?.lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    res.status(400).json({ error: "Valid lat/lon are required." });
    return;
  }
  const name = String(req.body?.name || `${la.toFixed(3)}, ${lo.toFixed(3)}`).slice(0, 80);
  const doc = { userId: req.user!.id, name, lat: la, lon: lo, createdAt: new Date() };
  const { insertedId } = await getDb().collection("locations").insertOne(doc);
  res.status(201).json({ id: String(insertedId), name, lat: la, lon: lo });
});

router.delete("/locations/:id", async (req, res) => {
  let oid: ObjectId;
  try {
    oid = new ObjectId(req.params.id);
  } catch {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  await getDb().collection("locations").deleteOne({ _id: oid, userId: req.user!.id });
  res.json({ ok: true });
});

export default router;
