import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import Brand from "../components/Brand.jsx";
import Icon from "../components/Icon.jsx";

export default function DashboardPage() {
  const { user, logout, connectionError, refreshSession } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    document.title = "Your account · Sweety";
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
            <p>Manage your account.</p>
          </div>
        </div>
        <section className="account-card" aria-labelledby="account-heading">
          <div className="account-card-heading">
            <div className="account-avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 id="account-heading">Your account</h2>
              <p>Your registration details.</p>
            </div>
            <span className="account-badge">
              <Icon name="check" size={14} /> Connected
            </span>
          </div>
          <dl className="account-details">
            <div>
              <dt>
                <Icon name="user" size={18} /> Name
              </dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>
                <Icon name="mail" size={18} /> Email address
              </dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>
                <Icon name="calendar" size={18} /> Member since
              </dt>
              <dd>
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "long",
                  timeZone: "Asia/Kolkata",
                }).format(new Date(user.created_at))}
              </dd>
            </div>
          </dl>
          <div className="account-footnote">
            <Icon name="shield" size={19} />
            <p>
              Your account keeps your personal readings separate from everyone
              else’s.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
