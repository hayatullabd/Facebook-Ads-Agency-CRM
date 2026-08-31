import type { ReactNode } from "react";

export function SidebarNav({ children, open = false }: { children: ReactNode; open?: boolean }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-[#d1d5db] bg-white px-2.5 py-3 text-[#1e40af] shadow-sm transition-transform duration-200 lg:translate-x-0 lg:w-56 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      {children}
    </aside>
  );
}
