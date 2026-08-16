import { Bell, ChevronRight, Command, FileText, LogOut, Menu, RefreshCw, Search, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AdRequest, Client, ClientUpdate, Invoice, Screen, Campaign } from "../../types/crm";

interface SearchItem { id: string; title: string; meta: string; kind: string; screen: Screen }

export function Topbar({ title, role, userName, onMenu, onLogout, onNavigate, clients, requests, campaigns, invoices, updates }: {
  title: string;
  role: string;
  userName: string;
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
  const unreadUpdates = updates.filter((item) => !(item.readBy?.length));
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

  return <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-[#20293a] bg-[#0a0e17]/95 px-4 py-2 backdrop-blur sm:px-6">
    <div className="flex min-w-0 items-center gap-3"><button className="crm-icon-button lg:hidden" onClick={onMenu} aria-label="Open navigation" title="Open navigation"><Menu className="size-4" /></button><div className="min-w-0"><h1 className="truncate text-base font-semibold text-slate-100 sm:text-lg">{title}</h1><p className="truncate text-xs text-slate-400">{userName}</p></div><span className="hidden rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-300 sm:inline-flex">{role}</span></div>
    <div className="flex items-center gap-2">
      <div className="relative hidden md:block"><div className="flex h-9 w-60 items-center gap-2 rounded-lg border border-[#263044] bg-[#0d121e] px-3 text-slate-500 transition focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/10"><Search className="size-4" /><input value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600" placeholder="Search workspace..." aria-label="Search workspace" /><kbd className="hidden items-center gap-0.5 rounded border border-[#263044] px-1.5 py-0.5 text-[10px] text-slate-600 lg:inline-flex"><Command className="size-3" />K</kbd></div>{searchOpen && <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-[#263044] bg-[#111827] shadow-2xl shadow-black/30">{query ? results.length ? <div className="p-1">{results.map((item) => <button key={`${item.kind}-${item.id}`} onClick={() => go(item.screen)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/5"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 text-[10px] font-semibold text-blue-300">{item.kind.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-200">{item.title}</p><p className="truncate text-[11px] text-slate-500">{item.meta}</p></div><ChevronRight className="size-3.5 text-slate-600" /></button>)}</div> : <div className="p-5 text-center text-xs text-slate-500">No matching records found.</div> : <div className="p-4"><p className="text-xs font-semibold text-slate-300">Search everything</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Find clients, requests, campaigns, and invoices from one place.</p></div>}</div>}</div>
      <div className="relative"><button className={`crm-icon-button relative ${notificationsOpen ? "border-blue-400/40 text-blue-300" : ""}`} onClick={() => { setNotificationsOpen((value) => !value); setSearchOpen(false); }} aria-label={`Notifications${notificationCount ? `, ${notificationCount} items` : ""}`} title="Notifications"><Bell className="size-4" />{notificationCount > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-slate-950">{notificationCount > 9 ? "9+" : notificationCount}</span>}</button>{notificationsOpen && <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-[#263044] bg-[#111827] shadow-2xl shadow-black/30"><div className="flex items-center justify-between border-b border-[#263044] px-4 py-3"><div><p className="text-sm font-semibold text-slate-100">Needs attention</p><p className="text-[11px] text-slate-500">Your operational follow-up queue</p></div><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications" className="text-slate-500 hover:text-slate-200"><X className="size-4" /></button></div><div className="max-h-80 overflow-y-auto p-2">{pendingRequests.length > 0 && <button onClick={() => go("requests")} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-white/5"><div className="flex size-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300"><FileText className="size-4" /></div><div><p className="text-xs font-semibold text-slate-200">{pendingRequests.length} request{pendingRequests.length > 1 ? "s" : ""} awaiting review</p><p className="mt-0.5 text-[11px] text-slate-500">Open the approval queue</p></div></button>}{overdueInvoices.length > 0 && <button onClick={() => go("billing")} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-white/5"><div className="flex size-8 items-center justify-center rounded-lg bg-rose-400/10 text-rose-300"><WalletCards className="size-4" /></div><div><p className="text-xs font-semibold text-slate-200">{overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""}</p><p className="mt-0.5 text-[11px] text-slate-500">Review billing follow-ups</p></div></button>}{(staleCampaigns.length > 0 || unreadUpdates.length > 0) && <button onClick={() => go(staleCampaigns.length > 0 ? "campaigns" : "updates")} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-white/5"><div className="flex size-8 items-center justify-center rounded-lg bg-blue-400/10 text-blue-300"><RefreshCw className="size-4" /></div><div><p className="text-xs font-semibold text-slate-200">{staleCampaigns.length + unreadUpdates.length} workspace update{staleCampaigns.length + unreadUpdates.length !== 1 ? "s" : ""}</p><p className="mt-0.5 text-[11px] text-slate-500">Sync or client communication needs attention</p></div></button>}{notificationCount === 0 && <div className="p-5 text-center text-xs text-slate-500">You are all caught up.</div>}</div></div>}</div>
      <button onClick={onLogout} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#263044] bg-[#0d121e] px-3 text-xs font-medium text-slate-300 transition hover:border-red-500/40 hover:text-red-300" title="Log out"><LogOut className="size-3.5" /><span className="hidden sm:inline">Logout</span></button>
    </div>
  </header>;
}
