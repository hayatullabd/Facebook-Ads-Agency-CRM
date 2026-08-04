import type { ReactNode } from "react";

export function StatusBadge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const tones = { default: "border-slate-500/25 bg-slate-500/10 text-slate-300", success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300", warning: "border-amber-400/25 bg-amber-400/10 text-amber-300", danger: "border-rose-400/25 bg-rose-400/10 text-rose-300" };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${tones[tone]}`}>{children}</span>;
}
