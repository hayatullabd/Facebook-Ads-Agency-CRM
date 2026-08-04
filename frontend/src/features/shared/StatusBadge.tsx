import type { ReactNode } from "react";

export function StatusBadge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const tones = { default: "border-slate-500/20 bg-slate-500/10 text-slate-300", success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400", warning: "border-amber-500/20 bg-amber-500/10 text-amber-400", danger: "border-red-500/20 bg-red-500/10 text-red-400" };
  return <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${tones[tone]}`}>{children}</span>;
}
