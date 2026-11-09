import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { get } from "./reports.controller.js";

const router = Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
router.use(requireAuth);
router.get("/", get);

export default router;
