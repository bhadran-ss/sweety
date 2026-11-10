import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiRequest, onUnauthorized } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const userRef = useRef(null);
  const version = useRef(0);

  const setSession = useCallback((nextUser) => {
    version.current++;
    userRef.current = nextUser;
    setUser(nextUser);
    setStatus(nextUser ? "authenticated" : "anonymous");
    setConnectionError("");
  }, []);

  const expireSession = useCallback(() => {
    if (userRef.current)
      setNotice("Your session has expired. Please sign in again.");
    setSession(null);
  }, [setSession]);

  const refreshSession = useCallback(
    async ({ initial = false, signal } = {}) => {
      const currentVersion = version.current;
      if (initial) setStatus("loading");
      try {
        const response = await apiRequest("/auth/me", {
          signal,
          notifyUnauthorized: false,
        });
        if (signal?.aborted || currentVersion !== version.current) return;
        setSession(response.data.user);
      } catch (error) {
        if (signal?.aborted || currentVersion !== version.current) return;
        if (error.status === 401) {
          expireSession();
        } else {
          setConnectionError(error.message);
          if (initial) setStatus("error");
        }
      }
    },
    [setSession, expireSession],
  );

  useEffect(() => onUnauthorized(expireSession), [expireSession]);

  useEffect(() => {
    const controller = new AbortController();
    refreshSession({ initial: true, signal: controller.signal });
    return () => controller.abort();
  }, [refreshSession]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const controller = new AbortController();
    let checking = false;
    const check = () => {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      refreshSession({ signal: controller.signal }).finally(() => {
        checking = false;
      });
    };
    const timer = setInterval(check, 60000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [status, refreshSession]);

  async function authenticate(path, credentials) {
    version.current++;
    const response = await apiRequest(path, {
      method: "POST",
      body: credentials,
      notifyUnauthorized: false,
    });
    setNotice("");
    setSession(response.data.user);
  }

  async function logout() {
    version.current++;
    await apiRequest("/auth/logout", {
      method: "POST",
      notifyUnauthorized: false,
    });
    setNotice("");
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        notice,
        connectionError,
        logout,
        refreshSession,
        login: (credentials) => authenticate("/auth/login", credentials),
        register: (credentials) => authenticate("/auth/register", credentials),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
