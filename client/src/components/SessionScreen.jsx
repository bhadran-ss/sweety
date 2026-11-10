import Brand from "./Brand.jsx";
import Icon from "./Icon.jsx";

export default function SessionScreen({ error, onRetry }) {
  return (
    <main className="session-screen">
      <Brand />
      <div className="session-card">
        {error ? (
          <Icon name="alert" size={30} />
        ) : (
          <span className="spinner" aria-hidden="true" />
        )}
        <h1>{error ? "Let’s try that again." : "A moment for you…"}</h1>
        <p role={error ? "alert" : "status"}>
          {error || "Opening your Sweety account."}
        </p>
        {error && (
          <button className="button button-primary" onClick={onRetry}>
            Try again <Icon name="arrow" />
          </button>
        )}
      </div>
    </main>
  );
}
