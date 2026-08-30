import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, Mail, Megaphone } from "lucide-react";
import { login, register, saveSession, type AuthResponse } from "../authApi";

type Mode = "login" | "register";

const passwordPolicyError = (password: string) => {
  const missing = [
    password.length >= 12 ? "" : "12 characters",
    /[A-Z]/.test(password) ? "" : "an uppercase letter",
    /[a-z]/.test(password) ? "" : "a lowercase letter",
    /\d/.test(password) ? "" : "a number",
    /[^A-Za-z0-9]/.test(password) ? "" : "a special character",
  ].filter(Boolean);
  return missing.length ? `Password must contain ${missing.join(", ")}.` : "";
};

export function AuthPage({ onEnter, message = "" }: { onEnter: (session: AuthResponse) => void; message?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [agencyName, setAgencyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "register") {
      const validationError = passwordPolicyError(password);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);
    try {
      const session = mode === "login" ? await login({ email, password }) : await register({ agencyName, name, email, password });
      saveSession(session);
      onEnter(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crm-auth-portal flex min-h-screen items-center justify-center px-4 py-6 sm:py-8">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-md bg-[#142b4a] text-white shadow-sm"><Megaphone className="size-5" /></div>
          <div className="text-center"><h1 className="text-xl font-bold text-[#10243e]">AdFlow Pro</h1><p className="mt-0.5 text-xs text-slate-500">Facebook Ads agency operations, in one place</p></div>
        </div>
        <div className="crm-auth-card overflow-hidden rounded-md border bg-white shadow-xl">
          <div className="crm-auth-tabs grid grid-cols-2 border-b border-slate-200">
            {(["login", "register"] as Mode[]).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setError(""); setPassword(""); }} className={`py-2.5 text-xs font-semibold capitalize transition ${mode === item ? "active border-b-2 border-[#142b4a] bg-slate-50 text-[#142b4a]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>{item === "login" ? "Sign In" : "Sign Up"}</button>)}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3.5 p-4 sm:p-5">
            <div><h2 className="text-base font-semibold text-slate-900">{mode === "login" ? "Welcome back" : "Create your agency"}</h2><p className="mt-0.5 text-xs text-slate-500">{mode === "login" ? "Enter your credentials to continue." : "Set up the admin account for your workspace."}</p></div>
            {message && <div role="status" className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">{message}</div>}
            {error && <div role="alert" className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}
            {mode === "register" && <><div><label className="crm-label" htmlFor="agency-name">Agency name</label><input id="agency-name" required value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className="crm-input" autoComplete="organization" /></div><div><label className="crm-label" htmlFor="full-name">Full name</label><input id="full-name" required value={name} onChange={(e) => setName(e.target.value)} className="crm-input" autoComplete="name" /></div></>}
            <div><label className="crm-label" htmlFor="email">Email address</label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><input id="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="crm-input pl-9" type="email" autoComplete="email" /></div></div>
            <div><label className="crm-label" htmlFor="password">Password</label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><input id="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="crm-input pl-9 pr-10" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 12 : 1} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{mode === "register" && <p className="mt-1.5 text-xs text-slate-500">Use 12+ characters with uppercase, lowercase, number, and special character.</p>}</div>
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60">{loading && <Loader2 className="size-4 animate-spin" />}{loading ? "Authenticating..." : mode === "login" ? "Sign In" : "Create Workspace"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
