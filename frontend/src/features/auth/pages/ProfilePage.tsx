import { useState, type FormEvent } from "react";
import { changePassword, clearSession, type AuthUser } from "../authApi";
import { SESSION_EXPIRED_EVENT } from "../../../lib/api";
import { Card } from "../../shared/Card";

export function ProfilePage({ user }: { user: AuthUser }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("New passwords do not match"); return; }
    setBusy(true);
    try {
      await changePassword(current, password);
      clearSession(); window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Password change failed"); }
    finally { setBusy(false); }
  };
  return <Card className="mx-auto max-w-xl p-6"><h2 className="text-xl font-semibold">My account</h2><p className="mt-2">{user.name} · {user.email}</p><p className="text-sm text-slate-500">Role: {user.role}</p><form onSubmit={submit} className="mt-6 space-y-4"><h3 className="font-semibold">Change password</h3><p className="text-sm text-slate-500">Use 12+ characters with uppercase, lowercase, a number, and a special character (maximum 72 UTF-8 bytes). Changing your password signs you out on every device.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<label className="block">Current password<input className="crm-input" type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} /></label><label className="block">New password<input className="crm-input" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} /></label><label className="block">Confirm new password<input className="crm-input" type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label><button disabled={busy} className="rounded bg-blue-800 px-4 py-2 text-white disabled:opacity-50">{busy ? "Saving..." : "Change password"}</button></form></Card>;
}
