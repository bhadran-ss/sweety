import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../auth/AuthContext.jsx";
import Brand from "../components/Brand.jsx";
import Icon from "../components/Icon.jsx";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { status, login, register, notice } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const errorRef = useRef(null);

  useEffect(() => {
    document.title = `${isRegister ? "Create account" : "Sign in"} · Sweety`;
  }, [isRegister]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (status === "authenticated") return <Navigate to="/dashboard" replace />;

  async function submit(credentials, demo = false) {
    if (submitting.current) return;
    setError("");
    if (new TextEncoder().encode(credentials.password).length > 72) {
      setError(
        "Your password is too long. Please use a shorter password (up to 72 UTF-8 bytes).",
      );
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      if (isRegister && !demo) await register(credentials);
      else
        await login({
          email: credentials.email,
          password: credentials.password,
        });
    } catch (err) {
      setError(err.message);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    submit({ ...form, name: form.name.trim(), email: form.email.trim() });
  }

  return (
    <main className="auth-layout">
      <header className="auth-header">
        <Brand />
        <p>Blood glucose tracker</p>
      </header>

      <section
        className="form-panel"
        aria-label={isRegister ? "Create your account" : "Sign in"}
      >
        <div className="auth-form-wrap">
          <h1>{isRegister ? "Create an account" : "Sign in"}</h1>
          {notice && !isRegister && (
            <div className="notice" role="status">
              <Icon name="alert" />
              <span>{notice}</span>
            </div>
          )}
          {error && (
            <div
              className="error-message"
              role="alert"
              tabIndex="-1"
              ref={errorRef}
            >
              <Icon name="alert" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} aria-busy={pending}>
            <fieldset disabled={pending}>
              {isRegister && (
                <div className="field">
                  <label htmlFor="name">Your name</label>
                  <input
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="password-field">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    required
                    minLength={isRegister ? 8 : 1}
                    placeholder={
                      isRegister ? "Create a password" : "Enter your password"
                    }
                    value={form.password}
                    aria-describedby={isRegister ? "password-hint" : undefined}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} />
                  </button>
                </div>
                {isRegister && (
                  <p className="field-hint" id="password-hint">
                    Use at least 8 characters.
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="button button-primary submit-button"
              >
                {pending ? (
                  <>
                    <span className="spinner spinner-small" /> Please wait…
                  </>
                ) : (
                  <>{isRegister ? "Create account" : "Sign in"}</>
                )}
              </button>
            </fieldset>
          </form>

          {!isRegister && (
            <>
              <div className="divider">
                <span>or</span>
              </div>
              <button
                type="button"
                className="button button-demo"
                disabled={pending}
                onClick={() =>
                  submit(
                    {
                      email: "demo@sweety.example",
                      password: "SweetyDemo123!",
                    },
                    true,
                  )
                }
              >
                Try demo account
              </button>
            </>
          )}
          {isRegister && (
            <p className="signup-note">
              <Icon name="check" size={16} /> You’ll be signed in as soon as
              your account is ready.
            </p>
          )}
        </div>
        <div className="auth-topline">
          <span>
            {isRegister ? "Already have an account?" : "New to Sweety?"}
          </span>
          <Link
            to={isRegister ? "/login" : "/register"}
            aria-disabled={pending}
            onClick={(event) => {
              if (pending) event.preventDefault();
            }}
          >
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </div>
      </section>
    </main>
  );
}
