import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className = "", ...props }: CardProps) {
  return <div {...props} className={`overflow-hidden rounded-md border border-[#dce2ea] bg-white text-[#17243b] shadow-[0_1px_3px_rgba(15,35,65,0.06)] ${className}`}>{children}</div>;
}
