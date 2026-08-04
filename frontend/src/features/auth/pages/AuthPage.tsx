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
  const [agencySlug, setAgencySlug] = useState("");
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
    <div className="relative flex min-h-screen overflow-hidden bg-[#070a12]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(99,102,241,0.12),transparent_30%)]" />
      <div className="relative hidden w-[52%] flex-col justify-between border-r border-white/[0.07] p-12 lg:flex xl:p-16">
        <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-950/40"><Megaphone className="size-5" /></div><p className="text-xl font-bold tracking-tight text-white">AdFlow <span className="text-blue-400">Pro</span></p></div>
        <div className="max-w-xl"><span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Built for modern agencies</span><h2 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">Turn every ad request into <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">measurable growth.</span></h2><p className="mt-5 max-w-lg text-base leading-7 text-slate-400">Manage clients, approvals, campaigns, billing and Meta performance from one secure enterprise workspace.</p><div className="mt-10 grid grid-cols-3 gap-3">{[["Unified", "Operations"], ["Live", "Meta data"], ["Secure", "Role access"]].map(([value, label]) => <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"><p className="font-bold text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>)}</div></div>
        <p className="text-xs text-slate-600">Premium agency operations platform</p>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-950/40"><Megaphone className="size-5" /></div>
          <div className="text-center"><h1 className="text-2xl font-bold text-white">AdFlow <span className="text-blue-400">Pro</span></h1><p className="mt-1 text-sm text-slate-500">Agency operations, in one place</p></div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/[0.09] bg-[#101522]/90 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="grid grid-cols-2 border-b border-[#20293a]">
            {(["login", "register"] as Mode[]).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setError(""); setPassword(""); }} className={`py-3.5 text-sm font-semibold capitalize transition ${mode === item ? "border-b-2 border-blue-500 bg-blue-500/5 text-blue-400" : "text-slate-500 hover:text-slate-300"}`}>{item === "login" ? "Sign In" : "Sign Up"}</button>)}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div><h2 className="text-lg font-semibold text-slate-100">{mode === "login" ? "Welcome back" : "Create your agency"}</h2><p className="mt-1 text-sm text-slate-500">{mode === "login" ? "Enter your credentials to continue." : "Set up the admin account for your workspace."}</p></div>
            {message && <div role="status" className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">{message}</div>}
            {error && <div role="alert" className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}
            {mode === "register" && <><div><label className="crm-label" htmlFor="agency-name">Agency name</label><input id="agency-name" required value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className="crm-input" autoComplete="organization" /></div><div><label className="crm-label" htmlFor="full-name">Full name</label><input id="full-name" required value={name} onChange={(e) => setName(e.target.value)} className="crm-input" autoComplete="name" /></div></>}
            {mode === "login" && <div><label className="crm-label" htmlFor="agency-slug">Agency slug (only if your email is in multiple workspaces)</label><input id="agency-slug" value={agencySlug} onChange={(e) => setAgencySlug(e.target.value)} className="crm-input" autoComplete="organization" /></div>}
            <div><label className="crm-label" htmlFor="email">Email address</label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><input id="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="crm-input pl-9" type="email" autoComplete="email" /></div></div>
            <div><label className="crm-label" htmlFor="password">Password</label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><input id="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="crm-input pl-9 pr-10" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 12 : 1} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{mode === "register" && <p className="mt-1.5 text-xs text-slate-500">Use 12+ characters with uppercase, lowercase, number, and special character.</p>}</div>
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60">{loading && <Loader2 className="size-4 animate-spin" />}{loading ? "Authenticating..." : mode === "login" ? "Sign In" : "Create Workspace"}</button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
