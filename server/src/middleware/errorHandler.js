import { AppError } from "../utils/AppError.js";

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  // Handle invalid JSON
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    error.type === "entity.parse.failed"
  ) {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must contain valid JSON.",
      },
    });
  }

  // Handle bodies exceeding the JSON parser's size limit.
  if (error.status === 413 && error.type === "entity.too.large") {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large.",
      },
    });
  }

  // Global application errors.
  if (
    error instanceof AppError &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  // Keep error details on the server.
  console.error("Unhandled request error:", {
    name: error.name,
    code: error.code,
    stack: error.stack,
  });

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  });
}
