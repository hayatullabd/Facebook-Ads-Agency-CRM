import { LogOut, Menu } from "lucide-react";

export function Topbar({ title, role, userName, onMenu, onLogout }: {
  title: string;
  role: string;
  userName: string;
  onMenu: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-[#20293a] bg-[#0a0e17]/95 px-4 py-2 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button className="crm-icon-button lg:hidden" onClick={onMenu} aria-label="Open navigation" title="Open navigation"><Menu className="size-4" /></button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-100 sm:text-lg">{title}</h1>
          <p className="truncate text-xs text-slate-400">{userName}</p>
        </div>
        <span className="hidden rounded border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-300 sm:inline-flex">{role}</span>
      </div>
      <button onClick={onLogout} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#263044] bg-[#0d121e] px-3 text-xs font-medium text-slate-300 transition hover:border-red-500/40 hover:text-red-300" title="Log out">
        <LogOut className="size-3.5" /><span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
