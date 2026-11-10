import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import Readings from "../components/Readings.jsx";
import Brand from "../components/Brand.jsx";
import Icon from "../components/Icon.jsx";

export default function DashboardPage() {
  const { user, logout, connectionError, refreshSession } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    document.title = "Your readings · Sweety";
  }, []);

  async function signOut() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await logout();
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Brand />
        <div className="header-account">
          <span className="signed-in-label">
            <span className="tiny-dot" /> Signed in
          </span>
          <button
            className="button button-logout"
            disabled={pending}
            onClick={signOut}
          >
            <Icon name="logout" size={18} />{" "}
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      <main className="dashboard-main">
        {(error || connectionError) && (
          <div className="error-message" role="alert">
            <Icon name="alert" />
            <span>{error || connectionError}</span>
            {connectionError && (
              <button className="text-button" onClick={() => refreshSession()}>
                Retry
              </button>
            )}
          </div>
        )}
        <div className="welcome-banner">
          <div>
            <h1>
              Hello, {user.name.split(" ")[0]}
              <span className="welcome-dot">.</span>
            </h1>
            <p>Record and manage your blood glucose readings.</p>
          </div>
        </div>
        <Readings />
      </main>
    </div>
  );
}
