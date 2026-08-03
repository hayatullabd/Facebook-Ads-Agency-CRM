import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "icon";

export function Button({ children, className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "border-blue-400/70 bg-blue-600 text-white hover:bg-blue-500",
    secondary: "border-[var(--border-strong)] bg-[var(--surface-muted)] text-slate-200 hover:border-slate-500 hover:bg-[var(--surface-elevated)]",
    danger: "border-red-400/50 bg-red-600 text-white hover:bg-red-500",
    ghost: "border-transparent bg-transparent text-slate-400 hover:bg-white/5 hover:text-white",
    icon: "size-11 border-[var(--border)] bg-[var(--surface-muted)] px-0 text-slate-400 hover:border-slate-500 hover:text-white",
  };
  return <button {...props} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-3.5 py-2 text-sm font-semibold shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${className}`}>{children}</button>;
}
