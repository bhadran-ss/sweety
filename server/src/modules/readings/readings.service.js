import { AppError } from "../../utils/AppError.js";
import {
  deleteReadingById,
  findDaySlots,
  findReadingById,
  findReadings,
  insertReading,
  updateReadingById,
} from "./readings.repository.js";

function readingNotFound() {
  return new AppError(404, "READING_NOT_FOUND", "Reading not found.");
}

async function checkAvailableSlot(userId, reading, excludedReadingId = null) {
  const slots = await findDaySlots(
    userId,
    reading.reading_date,
    excludedReadingId,
  );

  if (slots.length >= 4) {
    throw new AppError(
      409,
      "DAILY_LIMIT_REACHED",
      "You can add only four readings per day. Edit an existing reading instead.",
    );
  }

  if (slots.includes(reading.slot)) {
    throw new AppError(
      409,
      "DUPLICATE_READING_SLOT",
      "A reading already exists for this date and slot.",
    );
  }
}

async function handleWriteError(
  error,
  userId,
  reading,
  excludedReadingId = null,
) {
  if (
    error.code === "23505" &&
    error.constraint === "readings_user_date_slot_unique"
  ) {
    await checkAvailableSlot(userId, reading, excludedReadingId);
    throw new AppError(
      409,
      "DUPLICATE_READING_SLOT",
      "A reading already exists for this date and slot.",
    );
  }

  if (error.code === "23503" && error.constraint === "readings_user_id_fkey") {
    throw new AppError(401, "UNAUTHENTICATED", "Please log in again.");
  }

  throw error;
}

export function listReadings(userId, date) {
  return findReadings(userId, date);
}

export async function getReading(userId, readingId) {
  const reading = await findReadingById(userId, readingId);
  if (!reading) throw readingNotFound();
  return reading;
}

export async function createReading(userId, reading) {
  await checkAvailableSlot(userId, reading);

  try {
    return await insertReading(userId, reading);
  } catch (error) {
    return handleWriteError(error, userId, reading);
  }
}

export async function editReading(userId, readingId, reading) {
  await getReading(userId, readingId);
  await checkAvailableSlot(userId, reading, readingId);

  try {
    const updated = await updateReadingById(userId, readingId, reading);
    if (!updated) throw readingNotFound();
    return updated;
  } catch (error) {
    return handleWriteError(error, userId, reading, readingId);
  }
}

export async function removeReading(userId, readingId) {
  const deleted = await deleteReadingById(userId, readingId);
  if (!deleted) throw readingNotFound();
}
