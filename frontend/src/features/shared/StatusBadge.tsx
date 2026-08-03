import type { ReactNode } from "react";

export function StatusBadge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  const tones = {
    default: "border-slate-500/20 bg-slate-500/10 text-slate-300",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    danger: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    info: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  };
  return <span className={`inline-flex rounded border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[.08em] ${tones[tone]}`}>{children}</span>;
}
