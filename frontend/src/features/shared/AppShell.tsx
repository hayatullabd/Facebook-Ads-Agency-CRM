import type { ReactNode } from "react";

export function AppShell({ sidebar, topbar, children }: { sidebar: ReactNode; topbar: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(37,99,235,0.13),transparent_30%),radial-gradient(circle_at_20%_100%,rgba(99,102,241,0.08),transparent_28%)]" />
      <div className="relative flex min-h-screen">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-[272px]">
          {topbar}
          <main className="mx-auto w-full max-w-[1600px] flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-7 lg:px-8 xl:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
