import type { ReactNode } from "react";

export function AppShell({ sidebar, topbar, children }: { sidebar: ReactNode; topbar: ReactNode; children: ReactNode }) {
  return (
    <div className="crm-design-shell crm-light-portal crm-reference-shell min-h-screen bg-[#f4f7fb] text-slate-800">
      <div className="flex min-h-screen">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-[17.5rem]">
          {topbar}
          <main className="crm-main min-w-0 flex-1 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
