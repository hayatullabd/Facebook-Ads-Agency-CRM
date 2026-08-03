import type { ReactNode } from "react";

export function AppShell({ sidebar, topbar, children }: { sidebar: ReactNode; topbar: ReactNode; children: ReactNode }) {
  return <div className="min-h-screen bg-[#101214] text-[var(--text)]"><div className="flex min-h-screen">{sidebar}<div className="flex min-w-0 flex-1 flex-col lg:pl-60">{topbar}<main className="flex-1 overflow-x-hidden px-3 py-4 sm:px-5 lg:px-6">{children}</main></div></div></div>;
}
