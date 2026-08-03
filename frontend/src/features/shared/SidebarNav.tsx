import type { ReactNode } from "react";

export function SidebarNav({ children, open = false }: { children: ReactNode; open?: boolean }) {
  return <aside className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[#30343a] bg-[#17191c] px-3 py-4 transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>{children}</aside>;
}
