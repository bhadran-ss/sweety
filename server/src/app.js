import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { AppError } from "./utils/AppError.js";

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "Ok",
    message: "App is working!",
  });
});

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
