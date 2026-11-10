export const slots = [
  ["morning_fasting", "Morning (fasting)"],
  ["after_breakfast", "After breakfast"],
  ["after_lunch", "After lunch"],
  ["after_dinner", "After dinner"],
];

export function todayDate(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dateError(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < "0001-01-01")
    return "Please select a valid date.";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    return "Please select a valid date.";
  if (date > todayDate()) return "Date cannot be in the future.";
  return "";
}

export function readingError(form) {
  const error = dateError(form.reading_date);
  if (error) return error;
  if (!slots.some(([slot]) => slot === form.slot))
    return "Please select a time slot.";
  if (String(form.value).trim() === "") return "Please enter a glucose value.";
  const value = Number(form.value);
  if (!Number.isInteger(value) || value < 40 || value > 600)
    return "Value must be a whole number between 40 and 600 mg/dl.";
  return "";
}
