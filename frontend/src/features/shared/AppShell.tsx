import type { ReactNode } from "react";

export function AppShell({ sidebar, topbar, children }: { sidebar: ReactNode; topbar: ReactNode; children: ReactNode }) {
  return (
    <div className="crm-light-portal min-h-screen bg-[#f0f4f8] text-[#1f2937]">
      <div className="flex min-h-screen">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-56">
          {topbar}
          <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 pb-24 sm:px-5 sm:py-5 lg:px-7 lg:pb-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
