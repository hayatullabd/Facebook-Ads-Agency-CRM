import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className = "", ...props }: CardProps) {
  return <div {...props} className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.03)] ${className}`}>{children}</div>;
}
