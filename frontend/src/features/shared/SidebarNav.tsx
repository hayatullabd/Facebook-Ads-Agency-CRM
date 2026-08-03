import type { ReactNode } from "react";

export function SidebarNav({ children, open = false }: { children: ReactNode; open?: boolean }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.08] bg-[#0a0e0d]/95 px-4 py-5 shadow-[18px_0_54px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition-transform duration-300 motion-reduce:transition-none lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      {children}
    </aside>
  );
}
