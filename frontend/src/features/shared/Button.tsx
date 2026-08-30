import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return <button {...props} className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded border border-[#183b68] bg-[#183b68] px-3 py-1.5 text-xs font-semibold text-white transition hover:border-[#102f57] hover:bg-[#102f57] disabled:opacity-50 ${className}`}>{children}</button>;
}
