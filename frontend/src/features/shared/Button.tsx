import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return <button {...props} className={`crm-button inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#1d4ed8] bg-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-[#1e40af] hover:bg-[#1e40af] disabled:opacity-50 ${className}`}>{children}</button>;
}
