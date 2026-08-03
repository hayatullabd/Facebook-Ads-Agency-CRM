import { LogOut, Menu } from "lucide-react";

export function Topbar({ title, role, userName, onMenu, onLogout }: {
  title: string;
  role: string;
  userName: string;
  onMenu: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-[var(--border)] bg-[color:rgba(8,12,21,.88)] px-4 py-2 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button className="crm-icon-button lg:hidden" onClick={onMenu} aria-label="Open navigation" title="Open navigation"><Menu className="size-4" /></button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-100 sm:text-lg">{title}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400"><span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" /><span className="truncate">{userName}</span><span className="hidden text-slate-600 sm:inline">/</span><span className="hidden capitalize sm:inline">{role}</span></div>
        </div>
      </div>
      <button onClick={onLogout} className="crm-icon-button" aria-label="Log out" title="Log out">
        <LogOut className="size-4" />
      </button>
    </header>
  );
}
