import { Router } from "express";
import { getStats } from "../quota";

const router = Router();

router.get("/quota", async (_req, res) => {
  res.json(await getStats());
});

export default router;
