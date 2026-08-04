import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return <button {...props} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.24)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-300/50 hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_12px_30px_rgba(37,99,235,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:translate-y-0 disabled:opacity-50 ${className}`}>{children}</button>;
}
