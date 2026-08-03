import type { ReactNode } from "react";

export function Card({ children, className = "", interactive = false, elevated = false }: { children: ReactNode; className?: string; interactive?: boolean; elevated?: boolean }) {
  return <div className={`overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-slate-100 ${interactive ? "transition duration-150 hover:border-emerald-300/30 hover:bg-[var(--surface-elevated)]" : ""} ${elevated ? "shadow-[var(--shadow-lg)]" : "shadow-[var(--shadow-sm)]"} ${className}`}>{children}</div>;
}
