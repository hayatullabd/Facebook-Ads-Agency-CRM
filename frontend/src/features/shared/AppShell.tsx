import type { ReactNode } from "react";

export function AppShell({ sidebar, topbar, children }: { sidebar: ReactNode; topbar: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <div className="flex min-h-screen">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          {topbar}
          <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
