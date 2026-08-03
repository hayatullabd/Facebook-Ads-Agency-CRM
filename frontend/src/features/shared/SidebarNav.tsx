import type { ReactNode } from "react";

export function SidebarNav({ children, open = false }: { children: ReactNode; open?: boolean }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[var(--sidebar-border)] bg-[linear-gradient(180deg,#0b1220,#080d16)] px-3 py-4 shadow-[var(--shadow-lg)] transition-transform duration-300 motion-reduce:transition-none lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      {children}
    </aside>
  );
}
