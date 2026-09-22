import type { ReactNode } from "react";

export function SidebarNav({ children, open = false }: { children: ReactNode; open?: boolean }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-[#d6deea] bg-white/95 px-2.5 py-3 text-[#1e40af] shadow-[0_14px_30px_rgba(15,35,65,0.08)] backdrop-blur transition-transform duration-200 lg:translate-x-0 lg:w-56 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      {children}
    </aside>
  );
}
