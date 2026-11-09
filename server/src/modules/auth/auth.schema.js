import { Buffer } from "node:buffer";
import { z } from "zod";

export const registerSchema = z.strictObject({
  name: z
    .string({ error: "Please enter your name." })
    .trim()
    .min(1, "Please enter your name.")
    .max(100, "Name must not exceed 100 characters."),

  email: z
    .string({ error: "Please enter an email address." })
    .trim()
    .toLowerCase()
    .min(1, "Please enter an email address.")
    .max(254, "Email must not exceed 254 characters.")
    .pipe(
      z.email({
        error: "Please enter a valid email address.",
      }),
    ),

  password: z
    .string({ error: "Please enter a password." })
    .min(8, "Password must contain at least 8 characters.")
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
      error: "Password must not exceed 72 UTF-8 bytes.",
    }),
});

export const loginSchema = z.strictObject({
  email: z
    .string({ error: "Please enter your email address." })
    .trim()
    .toLowerCase()
    .min(1, "Please enter your email address.")
    .max(254, "Email must not exceed 254 characters.")
    .pipe(
      z.email({
        error: "Please enter a valid email address.",
      }),
    ),

  password: z
    .string({ error: "Please enter your password." })
    .min(1, "Please enter your password.")
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
      error: "Password must not exceed 72 UTF-8 bytes.",
    }),
});
