import { useEffect, useState } from "react";
import { SESSION_EXPIRED_EVENT } from "../lib/api";
import { clearSession, getSavedSession, type AuthResponse } from "../features/auth/authApi";

export function useSessionController() {
  const [session, setSession] = useState<AuthResponse | null>(() => getSavedSession());
  const [sessionMessage, setSessionMessage] = useState("");

  useEffect(() => {
    const expireSession = () => {
      clearSession();
      setSession(null);
      setSessionMessage("Your session expired. Please sign in again.");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
  }, []);

  const enter = (nextSession: AuthResponse) => {
    setSessionMessage("");
    setSession(nextSession);
  };

  const logout = () => {
    clearSession();
    setSession(null);
    setSessionMessage("");
  };

  return { session, sessionMessage, enter, logout };
}
