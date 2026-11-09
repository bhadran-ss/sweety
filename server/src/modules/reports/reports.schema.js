import { z } from "zod";
import { getTodayDate } from "../../utils/date.js";

export const reportsQuerySchema = z.strictObject({
  date: z
    .string({ error: "Please select a report date." })
    .min(1, "Please select a report date.")
    .pipe(
      z.iso.date({
        error: "Report date must be a valid date in YYYY-MM-DD format.",
      }),
    )
    .refine((date) => date >= "0001-02-01", {
      error: "Report date must be on or after 0001-02-01.",
    })
    .refine((date) => date <= getTodayDate(), {
      error: "Report date cannot be in the future (Asia/Kolkata).",
    }),
});
