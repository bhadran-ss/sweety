import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api.js";
import { dateError, slots, todayDate } from "../lib/readings.js";

const reportTypes = [
  ["daily", "Daily"],
  ["month_to_date", "Month-to-date"],
  ["previous_month", "Previous month"],
];
const formatDate = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

export default function Reports({ revision }) {
  const [date, setDate] = useState(todayDate);
  return (
    <section className="reports-section" aria-labelledby="reports-heading">
      <h2 id="reports-heading">Reports</h2>
      <p className="report-help">
        Choose a date to see its daily summary, month so far, and the whole
        previous month.
      </p>
      <div className="field day-picker">
        <label htmlFor="report-date">Report date</label>
        <input
          id="report-date"
          type="date"
          min="0001-02-01"
          max={todayDate()}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>
      <ReportResults key={`${date}-${revision}`} date={date} />
    </section>
  );
}

function ReportResults({ date }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const invalid =
    dateError(date) ||
    (date < "0001-02-01" ? "Report date must be on or after 0001-02-01." : "");
  useEffect(() => {
    if (invalid) return;
    const controller = new AbortController();
    apiRequest(`/reports?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted) setData(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [date, invalid, attempt]);
  if (invalid)
    return (
      <p className="error-message" role="alert">
        {invalid}
      </p>
    );
  if (error)
    return (
      <div className="error-message" role="alert">
        {error}
        <button
          className="text-button"
          onClick={() => {
            setError("");
            setAttempt((n) => n + 1);
          }}
        >
          Retry reports
        </button>
      </div>
    );
  if (!data) return <p role="status">Loading reports…</p>;
  return (
    <div className="reports-grid">
      {reportTypes.map(([key, title]) => {
        const report = data[key];
        return (
          <article
            className="report-card"
            key={key}
            aria-labelledby={`report-${key}`}
          >
            <h3 id={`report-${key}`}>{title}</h3>
            <p className="report-range">
              {formatDate(report.start_date)}
              {report.start_date !== report.end_date &&
                ` – ${formatDate(report.end_date)}`}
            </p>
            <dl className="report-stats">
              <div>
                <dt>Readings</dt>
                <dd>{report.count}</dd>
              </div>
              <div>
                <dt>Highest</dt>
                <dd>
                  {report.maximum ?? "—"}
                  {report.count > 0 && <small> mg/dl</small>}
                </dd>
              </div>
              <div>
                <dt>Lowest</dt>
                <dd>
                  {report.minimum ?? "—"}
                  {report.count > 0 && <small> mg/dl</small>}
                </dd>
              </div>
              <div>
                <dt>Average</dt>
                <dd>
                  {report.average == null ? "—" : report.average.toFixed(1)}
                  {report.count > 0 && <small> mg/dl</small>}
                </dd>
              </div>
            </dl>
            {report.count === 0 ? (
              <p className="report-empty">No readings in this period yet.</p>
            ) : (
              key === "daily" && (
                <ul
                  className="report-readings"
                  aria-label="Daily report readings"
                >
                  {report.readings.map((reading) => (
                    <li key={reading.id}>
                      <span>
                        {slots.find(([slot]) => slot === reading.slot)?.[1] ??
                          reading.slot}
                      </span>
                      <strong>{reading.value} mg/dl</strong>
                    </li>
                  ))}
                </ul>
              )
            )}
          </article>
        );
      })}
    </div>
  );
}
