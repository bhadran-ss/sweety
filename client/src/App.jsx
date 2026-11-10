import { Link, Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import SessionScreen from "./components/SessionScreen.jsx";
import Brand from "./components/Brand.jsx";

export default function App() {
  const { status, connectionError, refreshSession } = useAuth();
  if (status === "loading") return <SessionScreen />;
  if (status === "error")
    return (
      <SessionScreen
        error={connectionError}
        onRetry={() => refreshSession({ initial: true })}
      />
    );

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={status === "authenticated" ? "/dashboard" : "/login"}
            replace
          />
        }
      />
      <Route path="/login" element={<AuthPage key="login" mode="login" />} />
      <Route
        path="/register"
        element={<AuthPage key="register" mode="register" />}
      />
      <Route
        path="/dashboard"
        element={
          status === "authenticated" ? (
            <DashboardPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="*"
        element={
          <main className="session-screen">
            <Brand />
            <div className="session-card">
              <h1>A little off the path.</h1>
              <p>We couldn’t find that page.</p>
              <Link className="button button-primary" to="/">
                Back to Sweety
              </Link>
            </div>
          </main>
        }
      />
    </Routes>
  );
}
