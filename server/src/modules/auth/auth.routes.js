import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../../middleware/requireAuth.js";
import { AppError } from "../../utils/AppError.js";
import { login, logout, me, register } from "./auth.controller.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  handler: (req, res, next) => {
    return next(
      new AppError(
        429,
        "TOO_MANY_ATTEMPTS",
        "Too many authentication attempts. Please try again later.",
      ),
    );
  },
});
//Do not store responses
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", requireAuth, me);
router.post("/logout", logout);

export default router;
