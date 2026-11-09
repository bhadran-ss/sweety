import { AppError } from "../../utils/AppError.js";
import { reportsQuerySchema } from "./reports.schema.js";
import { getReports } from "./reports.service.js";

export async function get(req, res, next) {
  try {
    const validation = reportsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
      );
    }

    const reports = await getReports(req.auth.userId, validation.data.date);
    return res.status(200).json({ data: reports });
  } catch (error) {
    return next(error);
  }
}
