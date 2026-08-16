import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className = "", ...props }: CardProps) {
  return <div {...props} className={`overflow-hidden rounded-md border border-[#20293a] bg-[#131827] text-slate-100 shadow-[0_7px_20px_rgba(0,0,0,0.12)] ${className}`}>{children}</div>;
}
