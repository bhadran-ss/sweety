import cookieParser from "cookie-parser";
import express from "express";
import { cors } from "./middleware/cors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireTrustedOrigin } from "./middleware/requireTrustedOrigin.js";
import authRoutes from "./modules/auth/auth.routes.js";
import { AppError } from "./utils/AppError.js";

const app = express();

app.use("/api", cors);
app.use("/api", requireTrustedOrigin);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "Ok",
    message: "App is working!",
  });
});

app.use("/api/auth", authRoutes);

//No route exist
app.use((req, res, next) => {
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      "The requested endpoint does not exist.",
    ),
  );
});

// Error middleware
app.use(errorHandler);
export default app;
