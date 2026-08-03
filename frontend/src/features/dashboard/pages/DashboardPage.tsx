import { Users } from "lucide-react";
import type { AdRequest, Campaign, Client, FacebookOverview, Invoice, Role } from "../../../types/crm";
import { formatDate, formatMoney } from "../../../lib/formatters";
import { StatusBadge } from "../../shared/StatusBadge";

export function DashboardPage({ clients, requests, campaigns, invoices, facebookOverview, role }: { clients: Client[]; requests: AdRequest[]; campaigns: Campaign[]; invoices: Invoice[]; facebookOverview: FacebookOverview | null; role: Role }) {
  const reviewCount = requests.filter((item) => item.status === "Under Review").length;
  const liveCount = requests.filter((item) => item.status === "Live").length;
  const unpaidCount = invoices.filter((item) => item.status !== "Paid").length;
  const totalBudget = requests.reduce((total, item) => total + item.budget.amount, 0);
  const currency = requests[0]?.budget.currency ?? "BDT";

  return (
    <div className="crm-page-shell">
      <section className="flex flex-col gap-3 border-b border-[#30343a] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="crm-page-title">Operations sheet</h2><p className="crm-page-subtitle">All request data in one working table. No charts or visual dashboard layer.</p></div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[.1em] text-slate-500"><span>{requests.length} requests</span><span>{reviewCount} pending</span><span>{liveCount} live</span><span>{unpaidCount} unpaid invoices</span><span>Meta {facebookOverview?.connection.isConnected ? "connected" : "not connected"}</span></div>
      </section>

      <section className="overflow-hidden border border-[#30343a] bg-[#17191c]">
        <div className="flex flex-col gap-2 border-b border-[#30343a] bg-[#1c1f23] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-slate-200">Request register</p><p className="font-mono text-[10px] text-slate-500">TOTAL REQUESTED BUDGET · {formatMoney(totalBudget, currency)}</p></div>
        {requests.length ? <div className="crm-responsive-table"><table className="w-full min-w-[1180px] border-collapse text-left"><thead className="crm-table-head"><tr><th className="w-12 px-3 py-2.5 text-center">#</th><th className="px-3 py-2.5">Request</th><th className="px-3 py-2.5">Client</th><th className="px-3 py-2.5">Platform</th><th className="px-3 py-2.5">Objective</th><th className="px-3 py-2.5 text-right">Budget</th><th className="px-3 py-2.5 text-right">Days</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Submitted</th><th className="px-3 py-2.5">Owner</th></tr></thead><tbody>{requests.map((item, index) => <tr key={item._id} className="group hover:bg-white/[0.025]"><td className="crm-table-cell border-r border-[#30343a] text-center font-mono text-[10px] text-slate-600">{String(index + 1).padStart(2, "0")}</td><td className="crm-table-cell font-mono text-xs text-emerald-300">{item.requestNumber}</td><td className="crm-table-cell font-medium text-slate-200">{item.client?.name ?? "—"}</td><td className="crm-table-cell capitalize">{Array.isArray(item.platform) ? item.platform.join(", ") : item.platform}</td><td className="crm-table-cell">{item.objective}</td><td className="crm-table-cell text-right font-mono text-xs text-slate-200">{formatMoney(item.budget.amount, item.budget.currency)}<span className="ml-1 text-slate-600">/{item.budget.type === "daily" ? "d" : "l"}</span></td><td className="crm-table-cell text-right font-mono text-xs">{item.durationDays}</td><td className="crm-table-cell"><StatusBadge tone={item.status === "Live" ? "success" : item.status === "Rejected" ? "danger" : item.status === "Approved" ? "info" : "warning"}>{item.status}</StatusBadge></td><td className="crm-table-cell whitespace-nowrap text-xs text-slate-400">{formatDate(item.createdAt)}</td><td className="crm-table-cell text-xs text-slate-400">{item.submittedBy?.name ?? "—"}</td></tr>)}</tbody></table></div> : <div className="crm-empty"><Users className="size-5"/>No request records available.</div>}
      </section>

      <section className="grid gap-px border border-[#30343a] bg-[#30343a] sm:grid-cols-3">
        <div className="bg-[#17191c] px-3 py-3"><p className="crm-label">Campaign records</p><p className="font-mono text-sm text-slate-200">{campaigns.length}</p></div>
        <div className="bg-[#17191c] px-3 py-3"><p className="crm-label">Client records</p><p className="font-mono text-sm text-slate-200">{role === "moderator" ? "Restricted" : clients.length}</p></div>
        <div className="bg-[#17191c] px-3 py-3"><p className="crm-label">Invoice records</p><p className="font-mono text-sm text-slate-200">{invoices.length}</p></div>
      </section>
    </div>
  );
}
