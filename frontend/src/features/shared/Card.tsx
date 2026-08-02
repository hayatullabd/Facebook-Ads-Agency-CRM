import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-lg border border-[#20293a] bg-[#131827] text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.16)] ${className}`}>{children}</div>;
}
