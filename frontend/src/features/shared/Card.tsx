import type { HTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "", ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`crm-card ${className}`}>{children}</div>;
}
