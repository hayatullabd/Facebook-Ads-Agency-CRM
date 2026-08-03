import { LogOut, Menu, Search } from "lucide-react";

export function Topbar({ title, role, userName, onMenu, onLogout }: { title: string; role: string; userName: string; onMenu: () => void; onLogout: () => void; }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between border-b border-white/[0.08] bg-[#080b0a]/80 px-4 py-3 backdrop-blur-2xl sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button className="crm-icon-button lg:hidden" onClick={onMenu} aria-label="Open navigation" title="Open navigation"><Menu className="size-4" /></button>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-emerald-300">Operations / {role}</p>
          <h1 className="mt-1 truncate text-base font-semibold tracking-[-.015em] text-slate-100 sm:text-lg">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2.5 sm:gap-4">
        <div className="hidden items-center gap-2 border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-slate-500 md:flex" aria-label="Search workspace">
          <Search className="size-3.5" /><span>Search workspace</span><kbd className="ml-8 rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[9px] text-slate-600">⌘ K</kbd>
        </div>
        <div className="hidden items-center gap-2.5 border-l border-white/[0.08] pl-4 sm:flex">
          <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-teal-700 text-[10px] font-bold text-[#102016]">{userName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
          <div className="text-right"><p className="text-xs text-slate-200">{userName}</p><p className="mt-0.5 font-mono text-[9px] uppercase tracking-[.12em] text-emerald-300">Session active</p></div>
        </div>
        <button onClick={onLogout} className="crm-icon-button" aria-label="Log out" title="Log out"><LogOut className="size-4" /></button>
      </div>
    </header>
  );
}
