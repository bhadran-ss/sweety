import { APP_TIME_ZONE, getReportDateRanges } from "../../utils/date.js";
import { findReportSummaries } from "./reports.repository.js";

export async function getReports(userId, date) {
  const ranges = getReportDateRanges(date);
  const summaries = await findReportSummaries(userId, ranges);
  const reports = {};

  for (const { name, count, minimum, maximum, average, readings } of summaries) {
    reports[name] = {
      ...ranges[name],
      count,
      minimum,
      maximum,
      average,
      ...(name === "daily" ? { readings } : {}),
    };
  }

  return { selected_date: date, time_zone: APP_TIME_ZONE, ...reports };
}
