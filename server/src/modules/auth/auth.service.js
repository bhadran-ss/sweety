import { AppError } from "../../utils/AppError.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";

import {
  findPublicUserById,
  findUserByEmail,
  insertUser,
} from "./auth.repository.js";

const DUMMY_PASSWORD_HASH =
  "$2b$12$ysAWeYcXLi3WbtoaI1jM4u..mPKaEcXhw6VrzPRtdCqfyUj1Tgo4q";

export async function registerUser({ name, email, password }) {
  const passwordHash = await hashPassword(password);

  try {
    return await insertUser({
      name,
      email,
      passwordHash,
    });
  } catch (error) {
    if (error.code === "23505" && error.constraint === "users_email_unique") {
      throw new AppError(
        409,
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists.",
      );
    }

    throw error;
  }
}

export async function loginUser({ email, password }) {
  const user = await findUserByEmail(email);

  const passwordMatches = await verifyPassword(
    password,
    user?.password_hash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
    );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  };
}

export async function getCurrentUser(userId) {
  const user = await findPublicUserById(userId);

  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please log in again.");
  }

  return user;
}
