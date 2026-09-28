import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, Mail, Megaphone } from "lucide-react";
import { login, saveSession, type AuthResponse } from "../authApi";

export function AuthPage({ onEnter, message = "" }: { onEnter: (session: AuthResponse) => void; message?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await login({ email, password });
      saveSession(session);
      onEnter(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crm-auth-portal flex min-h-screen items-center justify-center px-4 py-8 sm:py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#1d4ed8] text-white shadow-sm"><Megaphone className="size-5" /></div>
          <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">AdFlow Pro</h1><p className="mt-1 text-sm text-slate-500">Facebook Ads agency operations, in one place</p></div>
        </div>
        <div className="crm-auth-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-7">
            <div><h2 className="text-lg font-semibold text-slate-900">Welcome back</h2><p className="mt-1 text-sm text-slate-500">Enter your credentials to continue.</p></div>
            {message && <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}
            {error && <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}
            <div><label className="crm-label" htmlFor="email">Email address</label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><input id="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="crm-input pl-9" type="email" autoComplete="email" /></div></div>
            <div><label className="crm-label" htmlFor="password">Password</label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><input id="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="crm-input pl-9 pr-10" type={showPassword ? "text" : "password"} autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e40af] disabled:opacity-60">{loading && <Loader2 className="size-4 animate-spin" />}{loading ? "Signing in..." : "Sign In"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
