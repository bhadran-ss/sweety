import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api.js";
import { dateError, readingError, slots, todayDate } from "../lib/readings.js";

const emptyForm = (date) => ({
  reading_date: date,
  slot: "morning_fasting",
  value: "",
});

export default function Readings() {
  const [date, setDate] = useState(todayDate);
  return (
    <section className="readings-section" aria-labelledby="readings-heading">
      <div className="readings-heading">
        <div>
          <h2 id="readings-heading">Your readings</h2>
          <p>Up to four readings a day.</p>
        </div>
      </div>
      <DailyReadings key={date} date={date} onDateChange={setDate} />
    </section>
  );
}

function DailyReadings({ date, onDateChange }) {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState(() => emptyForm(date));
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const errorRef = useRef(null);
  const formRef = useRef(null);
  const invalidDate = dateError(date);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (invalidDate) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    apiRequest(`/readings?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted) setReadings(data.readings);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoadError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, invalidDate, reload]);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm(date));
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    if (busy.current) return;
    let validation = readingError(form);
    if (!validation && form.reading_date === date) {
      const others = readings.filter((r) => r.id !== editing);
      if (others.length >= 4)
        validation = "You can add only 4 readings per day.";
      else if (others.some((r) => r.slot === form.slot))
        validation = `You already have a reading for ${slots.find(([key]) => key === form.slot)[1]} on this date.`;
    }
    setError(validation);
    setMessage("");
    if (validation) return;
    busy.current = true;
    setPending(true);
    try {
      const { data } = await apiRequest(
        editing ? `/readings/${editing}` : "/readings",
        {
          method: editing ? "PUT" : "POST",
          body: { ...form, value: Number(form.value) },
        },
      );
      setReadings((current) => [
        ...current.filter((r) => r.id !== data.reading.id),
        ...(data.reading.reading_date === date ? [data.reading] : []),
      ]);
      setMessage(
        editing
          ? `Reading updated for ${data.reading.reading_date}.`
          : `Reading added for ${data.reading.reading_date}.`,
      );
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function remove() {
    if (busy.current || !deleting) return;
    busy.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/readings/${deleting.id}`, { method: "DELETE" });
      setReadings((current) => current.filter((r) => r.id !== deleting.id));
      if (editing === deleting.id) resetForm();
      setDeleting(null);
      setMessage("Reading deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <div className="field day-picker">
        <label htmlFor="selected-date">View date</label>
        <input
          id="selected-date"
          type="date"
          min="0001-01-01"
          max={todayDate()}
          value={date}
          disabled={pending}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
      {invalidDate ? (
        <p role="alert" className="error-message">
          {invalidDate}
        </p>
      ) : loading ? (
        <p role="status">Loading readings…</p>
      ) : loadError ? (
        <div role="alert" className="error-message">
          {loadError}
          <button
            className="text-button"
            onClick={() => setReload((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {error && (
            <p
              className="error-message"
              role="alert"
              tabIndex={-1}
              ref={errorRef}
            >
              {error}
            </p>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <div className="readings-grid">
            <div className="reading-list">
              <h3>
                Daily readings <span>({readings.length}/4)</span>
              </h3>
              {readings.length === 0 && (
                <p className="empty-readings">
                  No readings for this date. Use the form to add your first
                  reading.
                </p>
              )}
              <ul>
                {slots.map(([slot, label]) => {
                  const reading = readings.find((r) => r.slot === slot);
                  return (
                    <li key={slot}>
                      <div>
                        <strong>{label}</strong>
                        <p>
                          {reading ? (
                            <>
                              <b>{reading.value}</b> mg/dl
                            </>
                          ) : (
                            "Not recorded"
                          )}
                        </p>
                      </div>
                      {reading && (
                        <div className="reading-actions">
                          <button
                            className="text-button"
                            disabled={pending || Boolean(deleting)}
                            aria-label={`Edit ${label}`}
                            onClick={() => {
                              setEditing(reading.id);
                              setForm({
                                reading_date: reading.reading_date,
                                slot: reading.slot,
                                value: String(reading.value),
                              });
                              setError("");
                              setMessage("");
                              formRef.current?.focus();
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-button"
                            disabled={pending || Boolean(deleting)}
                            aria-label={`Delete ${label}`}
                            onClick={() => {
                              setDeleting(reading);
                              setError("");
                              setMessage("");
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {deleting && (
                <div
                  className="delete-confirm"
                  role="group"
                  aria-label="Confirm deletion"
                >
                  <p>
                    Delete the {slots.find(([key]) => key === deleting.slot)[1]}{" "}
                    reading ({deleting.value} mg/dl)?
                  </p>
                  <div className="reading-actions">
                    <button
                      className="button button-primary"
                      disabled={pending}
                      onClick={remove}
                    >
                      {pending ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      className="button button-logout"
                      disabled={pending}
                      onClick={() => setDeleting(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <form
              className="reading-form"
              onSubmit={save}
              noValidate
              aria-busy={pending}
            >
              <h3 tabIndex={-1} ref={formRef}>
                {editing ? "Edit reading" : "Add reading"}
              </h3>
              <fieldset disabled={pending || Boolean(deleting)}>
                <div className="field">
                  <label htmlFor="reading-date">Reading date</label>
                  <input
                    id="reading-date"
                    type="date"
                    required
                    min="0001-01-01"
                    max={todayDate()}
                    value={form.reading_date}
                    onChange={(e) =>
                      setForm({ ...form, reading_date: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="reading-slot">Time slot</label>
                  <select
                    id="reading-slot"
                    value={form.slot}
                    onChange={(e) => setForm({ ...form, slot: e.target.value })}
                  >
                    {slots.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="reading-value">Glucose value (mg/dl)</label>
                  <input
                    id="reading-value"
                    type="number"
                    inputMode="numeric"
                    required
                    min="40"
                    max="600"
                    step="1"
                    value={form.value}
                    aria-describedby="value-hint"
                    onChange={(e) =>
                      setForm({ ...form, value: e.target.value })
                    }
                  />
                  <p className="field-hint" id="value-hint">
                    Whole numbers from 40 to 600.
                  </p>
                </div>
                <div className="reading-actions">
                  <button className="button button-primary" type="submit">
                    {pending
                      ? "Saving…"
                      : editing
                        ? "Save changes"
                        : "Add reading"}
                  </button>
                  {editing && (
                    <button
                      className="button button-logout"
                      type="button"
                      onClick={resetForm}
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </fieldset>
            </form>
          </div>
        </>
      )}
    </>
  );
}
