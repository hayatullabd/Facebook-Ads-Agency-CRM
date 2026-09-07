import { useCallback, useEffect, useRef, useState } from "react";
import { SESSION_EXPIRED_EVENT } from "../lib/api";
import { clearSession, getCurrentUser, getSavedSession, revokeSessions, saveSession, type AuthResponse } from "../features/auth/authApi";

export function useSessionController() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionError, setSessionError] = useState("");
  const generation = useRef(0);
  const verify = useCallback(async () => {
    const current = ++generation.current;
    const cached = getSavedSession();
    setChecking(true);
    setSessionError("");
    if (!cached) { setSession(null); setChecking(false); return; }
    try {
      const user = await getCurrentUser();
      if (current !== generation.current) return;
      const next = { token: cached.token, user };
      saveSession(next);
      setSession(next);
    } catch (error) {
      if (current !== generation.current) return;
      setSession(null);
      setSessionError(error instanceof Error ? error.message : "Could not verify your session");
    } finally { if (current === generation.current) setChecking(false); }
  }, []);

  useEffect(() => {
    const expire = () => {
      generation.current += 1;
      clearSession(); setSession(null); setChecking(false); setSessionError("");
      setSessionMessage("Your session expired. Please sign in again.");
    };
    const sync = (event: StorageEvent) => {
      if (event.key === null || event.key === "adflow_token" || event.key === "adflow_user") void verify();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    window.addEventListener("storage", sync);
    void verify();
    return () => {
      generation.current += 1;
      window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
      window.removeEventListener("storage", sync);
    };
  }, [verify]);

  const enter = (nextSession: AuthResponse) => {
    generation.current += 1;
    setSessionMessage(""); setSessionError(""); setChecking(false); setSession(nextSession);
  };
  const logout = async () => {
    try {
      await revokeSessions();
      generation.current += 1;
      clearSession(); setSession(null); setSessionError(""); setSessionMessage("Signed out on all devices.");
    } catch (error) { setSessionError(error instanceof Error ? error.message : "Sign out failed. Please retry."); }
  };
  return { session, checking, sessionError, sessionMessage, enter, logout, verify };
}
