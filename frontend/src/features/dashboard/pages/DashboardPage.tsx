import { AlertCircle, CircleDollarSign, FileText, Megaphone, Users } from "lucide-react";
import type { AdRequest, Campaign, Client, FacebookOverview, Invoice, Role } from "../../../types/crm";
import { formatMoney } from "../../../lib/formatters";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";

export function DashboardPage({ clients, requests, campaigns, invoices, facebookOverview, role }: { clients: Client[]; requests: AdRequest[]; campaigns: Campaign[]; invoices: Invoice[]; facebookOverview: FacebookOverview | null; role: Role }) {
  const moderator = role === "moderator";
  const billingByCurrency = Object.entries(invoices.reduce<Record<string, { billed: number; unpaid: number }>>((groups, invoice) => {
    const group = groups[invoice.currency] ||= { billed: 0, unpaid: 0 };
    group.billed += invoice.amount;
    if (invoice.status !== "Paid") group.unpaid += invoice.amount;
    return groups;
  }, {}));
  const stats = [
    { label: "Requests", value: String(requests.length), icon: FileText, meta: `${requests.filter((item) => item.status === "Under Review").length} awaiting review` },
    { label: "Campaigns", value: String(campaigns.length), icon: Megaphone, meta: `${campaigns.filter((item) => item.status === "active").length} active` },
    { label: "Clients", value: moderator ? "Not available" : String(clients.length), icon: Users, meta: moderator ? "Restricted for moderator role" : `${clients.filter((item) => item.status === "active").length} active` },
  ];
  return <div className="space-y-4">
    <div><h2 className="crm-page-title">Workspace overview</h2><p className="crm-page-subtitle">Operational performance without mixing currencies</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats.map(({ label, value, icon: Icon, meta }) => <Card key={label} className="p-4"><div className="flex items-start justify-between"><div><p className="text-[11px] uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{meta}</p></div><Icon className="size-5 text-blue-400"/></div></Card>)}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{moderator ? <Card className="p-4"><p className="text-[11px] uppercase text-slate-500">Billing</p><p className="mt-2 font-semibold text-slate-300">Not available</p><p className="mt-1 text-xs text-slate-500">Restricted for moderator role</p></Card> : billingByCurrency.map(([currency, totals]) => <Card key={currency} className="p-4"><div className="flex items-start justify-between"><div><p className="text-[11px] uppercase text-slate-500">{currency} billing</p><p className="mt-2 text-xl font-bold">{formatMoney(totals.billed, currency)}</p><p className="mt-1 text-xs text-red-400">{formatMoney(totals.unpaid, currency)} outstanding</p></div><CircleDollarSign className="size-5 text-blue-400"/></div></Card>)}</div>
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"><Card><div className="border-b border-[#20293a] px-4 py-3"><h3 className="text-sm font-semibold">Recent requests</h3></div>{requests.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead className="crm-table-head"><tr><th className="px-4 py-3">Request</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Objective</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{requests.slice(0, 5).map((item) => <tr key={item._id}><td className="crm-table-cell font-mono text-blue-400">{item.requestNumber}</td><td className="crm-table-cell">{item.client?.name ?? "—"}</td><td className="crm-table-cell">{item.objective}</td><td className="crm-table-cell"><StatusBadge tone={item.status === "Live" ? "success" : item.status === "Rejected" ? "danger" : "warning"}>{item.status}</StatusBadge></td></tr>)}</tbody></table></div> : <div className="crm-empty"><Users className="size-5"/>No requests have been submitted.</div>}</Card>
      <Card className="p-4"><div className="flex items-start justify-between"><div><h3 className="text-sm font-semibold">Facebook connection</h3><p className="text-xs text-slate-400">Graph API workspace status</p></div><StatusBadge tone={facebookOverview?.connection.isConnected ? "success" : "danger"}>{facebookOverview?.connection.status ?? "unavailable"}</StatusBadge></div><div className="mt-5 space-y-3"><p className="text-sm text-slate-300">{facebookOverview?.connection.accountCount ?? 0} ad accounts</p><p className="text-sm text-slate-300">{facebookOverview ? formatMoney(facebookOverview.overview.spend, facebookOverview.overview.currency) : "—"} spend</p>{!facebookOverview && <p className="flex items-center gap-2 text-xs text-amber-300"><AlertCircle className="size-4"/>Facebook metrics unavailable</p>}</div></Card></div>
  </div>;
}
