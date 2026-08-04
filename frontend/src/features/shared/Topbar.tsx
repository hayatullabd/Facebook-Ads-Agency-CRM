import { Bell, LogOut, Menu, Search } from "lucide-react";

export function Topbar({ title, role, userName, onMenu, onLogout }: {
  title: string;
  role: string;
  userName: string;
  onMenu: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between border-b border-white/[0.07] bg-[#070a12]/80 px-4 py-2 backdrop-blur-xl sm:px-6 lg:px-8 xl:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button className="crm-icon-button lg:hidden" onClick={onMenu} aria-label="Open navigation" title="Open navigation"><Menu className="size-4" /></button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h1>
          <p className="truncate text-xs text-slate-500">AdFlow Pro workspace</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden xl:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><input aria-label="Quick search" className="h-9 w-56 rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-600 focus:border-blue-500/50" placeholder="Search workspace" /></div>
        <button className="crm-icon-button hidden sm:inline-flex" aria-label="Notifications" title="Notifications"><Bell className="size-4" /></button>
        <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />
        <div className="hidden text-right sm:block"><p className="max-w-32 truncate text-xs font-semibold text-slate-200">{userName}</p><p className="text-[10px] font-medium uppercase tracking-wider text-blue-400">{role}</p></div>
        <div className="flex size-9 items-center justify-center rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/25 to-indigo-500/10 text-xs font-bold text-blue-200">{userName.slice(0, 2).toUpperCase()}</div>
        <button onClick={onLogout} className="crm-icon-button hover:border-rose-500/40 hover:text-rose-300" title="Log out" aria-label="Log out"><LogOut className="size-4" /></button>
      </div>
    </header>
  );
}
