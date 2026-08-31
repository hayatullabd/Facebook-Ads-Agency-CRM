import { Bell, ChevronRight, Command, FileText, LogOut, Menu, RefreshCw, Search, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AdRequest, Client, ClientUpdate, Invoice, Screen, Campaign } from "../../types/crm";

interface SearchItem { id: string; title: string; meta: string; kind: string; screen: Screen }

export function Topbar({ title, role, userName, userId, onMenu, onLogout, onNavigate, clients, requests, campaigns, invoices, updates }: {
  title: string;
  role: string;
  userName: string;
  userId: string;
  onMenu: () => void;
  onLogout: () => void;
  onNavigate: (screen: Screen) => void;
  clients: Client[];
  requests: AdRequest[];
  campaigns: Campaign[];
  invoices: Invoice[];
  updates: ClientUpdate[];
}) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadUpdates = updates.filter((item) => !item.readBy?.some((entry) => (typeof entry.user === "string" ? entry.user : entry.user._id) === userId));
  const pendingRequests = requests.filter((item) => !["Live", "Rejected"].includes(item.status));
  const overdueInvoices = invoices.filter((item) => item.status === "Overdue");
  const staleCampaigns = campaigns.filter((item) => item.isStale || item.status === "failed");
  const notificationCount = unreadUpdates.length + pendingRequests.length + overdueInvoices.length + staleCampaigns.length;
  const searchItems = useMemo<SearchItem[]>(() => [
    ...clients.map((item) => ({ id: item._id, title: item.name, meta: `${item.contactName || "Client"} · ${item.status}`, kind: "Client", screen: "clients" as Screen })),
    ...requests.map((item) => ({ id: item._id, title: item.requestNumber, meta: `${item.client?.name || item.pageName} · ${item.status}`, kind: "Request", screen: "requests" as Screen })),
    ...campaigns.map((item) => ({ id: item._id, title: item.name, meta: `${item.client?.name || "Campaign"} · ${item.status}`, kind: "Campaign", screen: "campaigns" as Screen })),
    ...invoices.map((item) => ({ id: item._id, title: item.invoiceNumber, meta: `${item.client?.name || item.pageName} · ${item.status}`, kind: "Invoice", screen: "billing" as Screen })),
  ], [clients, requests, campaigns, invoices]);
  const results = query.trim() ? searchItems.filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : [];

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => { if (event.key === "Escape") { setSearchOpen(false); setNotificationsOpen(false); } };
    window.addEventListener("keydown", closeMenus);
    return () => window.removeEventListener("keydown", closeMenus);
  }, []);
  const go = (screen: Screen) => { onNavigate(screen); setSearchOpen(false); setNotificationsOpen(false); setQuery(""); };

  return <header className="crm-topbar sticky top-0 z-30 flex min-h-14 flex-col gap-2 border-b border-[#d1d5db] bg-white px-3 py-2 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex min-w-0 items-center gap-2.5">
      <button className="crm-icon-button lg:hidden" onClick={onMenu} aria-label="Open navigation" title="Open navigation"><Menu className="size-4" /></button>
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-slate-800 sm:text-base">{title}</h1>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 sm:text-xs">
          <span className="truncate">{userName}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold uppercase text-blue-700">{role}</span>
        </div>
      </div>
    </div>
    <div className="flex w-full items-center gap-2 lg:w-auto lg:justify-end">
      <div className="relative hidden flex-1 md:block lg:w-60 lg:flex-none"><div className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-slate-500 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/10"><Search className="size-4" /><input value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400" placeholder="Search workspace..." aria-label="Search workspace" /><kbd className="hidden items-center gap-0.5 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-500 lg:inline-flex"><Command className="size-3" />K</kbd></div>{searchOpen && <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">{query ? results.length ? <div className="p-1">{results.map((item) => <button key={`${item.kind}-${item.id}`} onClick={() => go(item.screen)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-semibold text-blue-700">{item.kind.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{item.title}</p><p className="truncate text-[11px] text-slate-500">{item.meta}</p></div><ChevronRight className="size-3.5 text-slate-400" /></button>)}</div> : <div className="p-5 text-center text-xs text-slate-500">No matching records found.</div> : <div className="p-4"><p className="text-xs font-semibold text-slate-700">Search everything</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Find clients, requests, campaigns, and invoices from one place.</p></div>}</div>}</div>
      <div className="relative ml-auto"><button className={`crm-icon-button relative ${notificationsOpen ? "border-blue-300 text-blue-700" : ""}`} onClick={() => { setNotificationsOpen((value) => !value); setSearchOpen(false); }} aria-label={`Notifications${notificationCount ? `, ${notificationCount} items` : ""}`} title="Notifications"><Bell className="size-4" />{notificationCount > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-slate-950">{notificationCount > 9 ? "9+" : notificationCount}</span>}</button>{notificationsOpen && <div className="absolute right-0 top-11 z-50 w-[calc(100vw-1.5rem)] max-w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 sm:w-80"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-sm font-semibold text-slate-800">Needs attention</p><p className="text-[11px] text-slate-500">Your operational follow-up queue</p></div><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications" className="text-slate-500 hover:text-slate-700"><X className="size-4" /></button></div><div className="max-h-80 overflow-y-auto p-2">{pendingRequests.length > 0 && <button onClick={() => go("requests")} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-slate-50"><div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><FileText className="size-4" /></div><div><p className="text-xs font-semibold text-slate-800">{pendingRequests.length} request{pendingRequests.length > 1 ? "s" : ""} awaiting review</p><p className="mt-0.5 text-[11px] text-slate-500">Open the approval queue</p></div></button>}{overdueInvoices.length > 0 && <button onClick={() => go("billing")} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-slate-50"><div className="flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700"><WalletCards className="size-4" /></div><div><p className="text-xs font-semibold text-slate-800">{overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""}</p><p className="mt-0.5 text-[11px] text-slate-500">Review billing follow-ups</p></div></button>}{(staleCampaigns.length > 0 || unreadUpdates.length > 0) && <button onClick={() => go(staleCampaigns.length > 0 ? "campaigns" : "updates")} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-slate-50"><div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><RefreshCw className="size-4" /></div><div><p className="text-xs font-semibold text-slate-800">{staleCampaigns.length + unreadUpdates.length} workspace update{staleCampaigns.length + unreadUpdates.length !== 1 ? "s" : ""}</p><p className="mt-0.5 text-[11px] text-slate-500">Sync or client communication needs attention</p></div></button>}{notificationCount === 0 && <div className="p-5 text-center text-xs text-slate-500">You are all caught up.</div>}</div></div>}</div>
      <button onClick={onLogout} className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600" title="Log out"><LogOut className="size-3.5" /><span className="hidden sm:inline">Logout</span></button>
    </div>
  </header>;
}
