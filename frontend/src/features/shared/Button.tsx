import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return <button {...props} className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-blue-500 bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 ${className}`}>{children}</button>;
}
