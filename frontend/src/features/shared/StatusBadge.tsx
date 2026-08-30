import type { ReactNode } from "react";

export function StatusBadge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const tones = { default: "border-slate-300 bg-slate-100 text-slate-700", success: "border-emerald-200 bg-emerald-50 text-emerald-700", warning: "border-amber-200 bg-amber-50 text-amber-800", danger: "border-red-200 bg-red-50 text-red-700" };
  return <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${tones[tone]}`}>{children}</span>;
}
