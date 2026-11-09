import { AppError } from "../../utils/AppError.js";
import { clearAuthCookie, setAuthCookie } from "../../utils/authCookie.js";
import { createAccessToken } from "../../utils/token.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { getCurrentUser, loginUser, registerUser } from "./auth.service.js";

export async function register(req, res, next) {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
      );
    }

    const user = await registerUser(validation.data);
    const token = createAccessToken(user.id);

    setAuthCookie(res, token);

    return res.status(201).json({
      message: "Account created successfully.",
      data: { user },
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
      );
    }

    const user = await loginUser(validation.data);
    const token = createAccessToken(user.id);

    setAuthCookie(res, token);

    return res.status(200).json({
      message: "Logged in successfully.",
      data: { user },
    });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await getCurrentUser(req.auth.userId);

    return res.status(200).json({
      data: { user },
    });
  } catch (error) {
    return next(error);
  }
}

export function logout(req, res) {
  clearAuthCookie(res);

  return res.status(200).json({
    message: "Logged out successfully.",
  });
}
