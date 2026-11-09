import { AppError } from "../../utils/AppError.js";
import {
  readingParamsSchema,
  readingSchema,
  readingsQuerySchema,
} from "./readings.schema.js";
import {
  createReading,
  editReading,
  getReading,
  listReadings,
  removeReading,
} from "./readings.service.js";

function validate(schema, input) {
  const validation = schema.safeParse(input);
  if (!validation.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      validation.error.issues[0].message,
    );
  }
  return validation.data;
}

export async function list(req, res, next) {
  try {
    const { date } = validate(readingsQuerySchema, req.query);
    const readings = await listReadings(req.auth.userId, date);
    return res.status(200).json({ data: { readings } });
  } catch (error) {
    return next(error);
  }
}

export async function get(req, res, next) {
  try {
    const { id } = validate(readingParamsSchema, req.params);
    const reading = await getReading(req.auth.userId, id);
    return res.status(200).json({ data: { reading } });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const input = validate(readingSchema, req.body);
    const reading = await createReading(req.auth.userId, input);
    return res.status(201).json({
      message: "Reading added successfully.",
      data: { reading },
    });
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = validate(readingParamsSchema, req.params);
    const input = validate(readingSchema, req.body);
    const reading = await editReading(req.auth.userId, id, input);
    return res.status(200).json({
      message: "Reading updated successfully.",
      data: { reading },
    });
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = validate(readingParamsSchema, req.params);
    await removeReading(req.auth.userId, id);
    return res.status(200).json({ message: "Reading deleted successfully." });
  } catch (error) {
    return next(error);
  }
}
