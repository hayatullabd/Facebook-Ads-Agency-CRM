import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, CircleDollarSign, Download, FileText, Megaphone, Users } from "lucide-react";
import type { AdRequest, Campaign, Client, Invoice, Screen } from "../../../types/crm";
import { formatDate, formatMoney } from "../../../lib/formatters";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";

type Props = { invoices: Invoice[]; requests: AdRequest[]; campaigns: Campaign[]; clients: Client[]; onNavigate: (screen: Screen) => void };
type PlannerKind = "invoice" | "request" | "campaign";
type PlannerItem = { id: string; title: string; detail: string; date: string; kind: PlannerKind; tone: "danger" | "warning" | "success"; action: string; screen: Screen };
type RangeFilter = "all" | "overdue" | "today" | "next7" | "next30";
type KindFilter = "all" | PlannerKind;

const daysFromToday = (value: string) => Math.ceil((new Date(value).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
const dayLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

export function PlannerPage({ invoices, requests, campaigns, clients, onNavigate }: Props) {
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const items: PlannerItem[] = useMemo(() => [
    ...invoices.filter((item) => item.status !== "Paid").map((item) => ({ id: `invoice-${item._id}`, title: item.invoiceNumber, detail: `${item.client?.name || "Unassigned client"} · ${formatMoney(item.amount)}`, date: item.dueDate, kind: "invoice" as const, tone: item.status === "Overdue" ? "danger" as const : "warning" as const, action: item.status === "Overdue" ? "Overdue" : "Payment due", screen: "billing" as Screen })),
    ...requests.filter((item) => ["Under Review", "Approved"].includes(item.status)).map((item) => ({ id: `request-${item._id}`, title: item.requestNumber, detail: `${item.client?.name || "Unassigned client"} · ${item.pageName}`, date: item.updatedAt || item.createdAt, kind: "request" as const, tone: item.status === "Under Review" ? "warning" as const : "success" as const, action: item.status, screen: "requests" as Screen })),
    ...campaigns.filter((item) => item.endDate && ["active", "scheduled"].includes(item.status)).map((item) => ({ id: `campaign-${item._id}`, title: item.name, detail: `${item.client?.name || "Unassigned client"} · ${item.platform}`, date: item.endDate as string, kind: "campaign" as const, tone: "warning" as const, action: "Campaign end", screen: "campaigns" as Screen })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [campaigns, invoices, requests]);
  const visibleItems = useMemo(() => items.filter((item) => {
    const days = daysFromToday(item.date);
    const inRange = rangeFilter === "all" || (rangeFilter === "overdue" && days < 0) || (rangeFilter === "today" && days === 0) || (rangeFilter === "next7" && days >= 0 && days <= 7) || (rangeFilter === "next30" && days >= 0 && days <= 30);
    return inRange && (kindFilter === "all" || item.kind === kindFilter);
  }), [items, kindFilter, rangeFilter]);
  const grouped = useMemo(() => visibleItems.reduce<Record<string, PlannerItem[]>>((groups, item) => { const key = dayLabel(item.date); (groups[key] ||= []).push(item); return groups; }, {}), [visibleItems]);
  const overdue = items.filter((item) => item.kind === "invoice" && daysFromToday(item.date) < 0).length;
  const dueSoon = items.filter((item) => daysFromToday(item.date) >= 0 && daysFromToday(item.date) <= 7).length;
  const activeClients = clients.filter((item) => item.status === "active").length;
  const exportPlanner = () => {
    const rows = [["Type", "Title", "Detail", "Date", "Action"], ...visibleItems.map((item) => [item.kind, item.title, item.detail, item.date, item.action])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = `adflow-planner-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };
  const iconFor = (kind: PlannerKind) => kind === "invoice" ? CircleDollarSign : kind === "request" ? FileText : Megaphone;
  return <div className="crm-light-portal space-y-3">
    <div className="crm-page-header"><div className="crm-page-header-main"><div className="crm-page-header-tab"><h2 className="crm-page-title">Planner</h2></div><div className="crm-page-header-meta"><p className="crm-page-subtitle">Deadlines, approvals, payments, and campaign schedules in one view</p></div></div><button type="button" onClick={exportPlanner} className="crm-secondary-button"><Download className="size-4" />Export view</button></div>
    <section className="grid gap-3 sm:grid-cols-3"><Card className="p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Overdue</p><p className="mt-1.5 text-xl font-bold text-red-200">{overdue}</p><p className="mt-1 text-xs text-slate-500">Payment items requiring action</p></Card><Card className="p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Next 7 days</p><p className="mt-1.5 text-xl font-bold text-amber-200">{dueSoon}</p><p className="mt-1 text-xs text-slate-500">Upcoming deadlines and approvals</p></Card><Card className="p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Active clients</p><p className="mt-1.5 text-xl font-bold text-blue-200">{activeClients}</p><p className="mt-1 text-xs text-slate-500">Accounts currently in motion</p></Card></section>
    <Card><div className="flex flex-col gap-2 border-b border-[#20293a] p-3 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-semibold text-slate-100">Calendar view</h3><p className="mt-1 text-xs text-slate-500">{visibleItems.length} items matched</p></div><div className="flex flex-wrap gap-2"><select aria-label="Filter planner date range" className="crm-input min-w-36" value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value as RangeFilter)}><option value="all">All dates</option><option value="overdue">Overdue</option><option value="today">Today</option><option value="next7">Next 7 days</option><option value="next30">Next 30 days</option></select><select aria-label="Filter planner item type" className="crm-input min-w-36" value={kindFilter} onChange={(event) => setKindFilter(event.target.value as KindFilter)}><option value="all">All work types</option><option value="invoice">Billing</option><option value="request">Requests</option><option value="campaign">Campaigns</option></select></div></div>{visibleItems.length ? <div className="divide-y divide-[#20293a]">{Object.entries(grouped).map(([day, dayItems]) => <section key={day}><div className="sticky top-0 z-[1] border-b border-[#20293a] bg-[#101827] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{day}</div>{dayItems.map((item) => { const ItemIcon = iconFor(item.kind); const days = daysFromToday(item.date); return <button key={item.id} type="button" onClick={() => onNavigate(item.screen)} className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-white/[0.03]"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300"><ItemIcon className="size-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-200">{item.title}</span><StatusBadge tone={item.tone}>{item.action}</StatusBadge></span><span className="mt-1 block truncate text-xs text-slate-500">{item.detail}</span></span><span className="shrink-0 text-right"><span className="block text-xs font-semibold text-slate-300">{formatDate(item.date)}</span><span className={`mt-1 block text-[11px] ${days < 0 ? "text-red-300" : days <= 7 ? "text-amber-300" : "text-slate-500"}`}>{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `In ${days}d`}</span></span></button>; })}</section>)}</div> : <div className="crm-empty"><CheckCircle2 className="size-5" />No work matches these filters.</div>}</Card>
    <div className="grid gap-3 sm:grid-cols-3"><button type="button" onClick={() => onNavigate("billing")} className="rounded border border-slate-200 bg-white p-3 text-left hover:border-blue-300"><CircleDollarSign className="size-5 text-amber-300" /><p className="mt-2 text-sm font-semibold text-slate-200">Review billing</p><p className="mt-1 text-xs text-slate-500">Clear overdue and due-soon invoices.</p></button><button type="button" onClick={() => onNavigate("requests")} className="rounded-md border border-[#263044] bg-[#101827] p-3 text-left hover:border-blue-400/30"><FileText className="size-5 text-blue-300" /><p className="mt-2 text-sm font-semibold text-slate-200">Review approvals</p><p className="mt-1 text-xs text-slate-500">Move pending ad requests forward.</p></button><button type="button" onClick={() => onNavigate("clients")} className="rounded-md border border-[#263044] bg-[#101827] p-3 text-left hover:border-blue-400/30"><Users className="size-5 text-emerald-300" /><p className="mt-2 text-sm font-semibold text-slate-200">Open clients</p><p className="mt-1 text-xs text-slate-500">Jump into Client 360 workspaces.</p></button></div>
  </div>;
}

export default PlannerPage;
