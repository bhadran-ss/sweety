import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { create, get, list, remove, update } from "./readings.controller.js";

const router = Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
router.use(requireAuth);

router.get("/", list);
router.get("/:id", get);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
