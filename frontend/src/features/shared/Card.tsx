import type { ReactNode } from "react";

export function Card({ children, className = "", interactive = false, elevated = false }: { children: ReactNode; className?: string; interactive?: boolean; elevated?: boolean }) {
  return <div className={`overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[linear-gradient(145deg,rgba(21,30,47,.98),rgba(13,19,31,.98))] text-slate-100 shadow-[var(--shadow-sm)] ${interactive ? "transition duration-200 hover:-translate-y-0.5 hover:border-blue-400/30 hover:shadow-[var(--shadow-lg)]" : ""} ${elevated ? "shadow-[var(--shadow-lg)]" : ""} ${className}`}>{children}</div>;
}
