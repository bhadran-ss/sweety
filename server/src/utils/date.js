export const APP_TIME_ZONE = "Asia/Kolkata";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getTodayDate(now = new Date()) {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(now).map(({ type, value }) => [type, value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getReportDateRanges(date) {
  const monthStart = `${date.slice(0, 7)}-01`;
  const previousMonthEnd = new Date(`${monthStart}T00:00:00.000Z`);
  previousMonthEnd.setUTCDate(0);
  const previousEnd = previousMonthEnd.toISOString().slice(0, 10);

  return {
    daily: { start_date: date, end_date: date },
    month_to_date: { start_date: monthStart, end_date: date },
    previous_month: {
      start_date: `${previousEnd.slice(0, 7)}-01`,
      end_date: previousEnd,
    },
  };
}
