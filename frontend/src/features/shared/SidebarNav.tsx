import type { ReactNode } from "react";

export function SidebarNav({ children, open = false }: { children: ReactNode; open?: boolean }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-white/[0.07] bg-[#090d17]/98 px-4 py-5 shadow-[20px_0_60px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      {children}
    </aside>
  );
}
