import type { ReactNode } from "react";

export function AppShell({ sidebar, topbar, children }: { sidebar: ReactNode; topbar: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#080b0a] text-[var(--text)] selection:bg-emerald-300 selection:text-[#102016]">
      <div className="relative flex min-h-screen before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_82%_-12%,rgba(93,177,130,0.11),transparent_31%),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.014)_1px,transparent_1px)] before:bg-[size:auto,52px_52px,52px_52px]">
        {sidebar}
        <div className="relative z-10 flex min-w-0 flex-1 flex-col lg:pl-64">
          {topbar}
          <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-7 lg:px-9 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
