import { z } from "zod";
import { getTodayDate } from "../../utils/date.js";

const readingDateSchema = z
  .string({ error: "Please select a reading date." })
  .min(1, "Please select a reading date.")
  .pipe(
    z.iso.date({
      error: "Reading date must be a valid date in YYYY-MM-DD format.",
    }),
  )
  .refine((date) => date >= "0001-01-01", {
    error: "Please select a valid reading date.",
  })
  .refine((date) => date <= getTodayDate(), {
    error: "Reading date cannot be in the future (Asia/Kolkata).",
  });

export const readingSchema = z.strictObject({
  reading_date: readingDateSchema,
  slot: z.enum(
    ["morning_fasting", "after_breakfast", "after_lunch", "after_dinner"],
    { error: "Select Morning fasting, After breakfast, After lunch, or After dinner." },
  ),
  value: z
    .number({ error: "Please enter a numeric glucose value." })
    .int("Glucose value must be a whole number.")
    .min(40, "Glucose value must be between 40 and 600 mg/dl.")
    .max(600, "Glucose value must be between 40 and 600 mg/dl."),
});

export const readingsQuerySchema = z.strictObject({
  date: readingDateSchema.optional(),
});

export const readingParamsSchema = z.strictObject({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "Reading ID must be a positive integer.")
    .transform(Number)
    .refine((id) => Number.isInteger(id) && id <= 2147483647, {
      error: "Reading ID is outside the supported range.",
    }),
});
