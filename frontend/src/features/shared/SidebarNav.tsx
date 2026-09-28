import type { ReactNode } from "react";

export function SidebarNav({ children, open = false }: { children: ReactNode; open?: boolean }) {
  return (
    <aside className={`crm-sidebar fixed inset-y-0 left-0 z-50 flex w-[17.5rem] max-w-[86vw] flex-col border-r border-slate-200 bg-white px-3 py-4 text-slate-700 shadow-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}>
      {children}
    </aside>
  );
}
