import { ArrowRight, ArrowUpRight, CheckCircle2, CircleDollarSign, Clock3, FileText, Megaphone, RefreshCw, Users, WalletCards } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router";
import type { AdRequest, Campaign, Client, FacebookOverview, Invoice, Role } from "../../../types/crm";
import { formatDate, formatMoney } from "../../../lib/formatters";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";
import { PlatformDashboard } from "./PlatformDashboard";

const formatInvoiceTotals = (invoices: Invoice[], fallbackCurrency = "USD") => {
  const totals = new Map<string, number>();
  invoices.forEach((invoice) => totals.set(invoice.currency, (totals.get(invoice.currency) || 0) + invoice.amount));
  return totals.size
    ? [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" · ")
    : formatMoney(0, fallbackCurrency);
};

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

const requestTone = (status: AdRequest["status"]) => status === "Rejected" ? "danger" : status === "Live" ? "success" : "warning";
const campaignTone = (status: Campaign["status"]) => status === "active" ? "success" : status === "failed" ? "danger" : "warning";

export function DashboardPage({ role, platformRole, features, featuresConfigured, clients, requests, campaigns, invoices, facebookOverview }: { role: Role; platformRole?: string; features?: string[]; featuresConfigured?: boolean; clients: Client[]; requests: AdRequest[]; campaigns: Campaign[]; invoices: Invoice[]; facebookOverview: FacebookOverview | null }) {
  if (platformRole === "admin") return <PlatformDashboard />;
  const canOpen = (feature: string) => role !== "team" || !featuresConfigured || (features || []).includes(feature);
  const fallbackCurrency = facebookOverview?.overview?.currency || invoices[0]?.currency || campaigns[0]?.budget?.currency || "USD";
  const unpaidInvoices = invoices.filter((item) => item.status !== "Paid");
  const overdueInvoices = invoices.filter((item) => item.status === "Overdue");
  const pendingRequests = requests.filter((item) => !["Live", "Rejected"].includes(item.status));
  const activeCampaigns = campaigns.filter((item) => item.status === "active");
  const activeClients = clients.filter((item) => item.status === "active");
  const roleLabel = role === "client" ? "Client overview" : role === "moderator" ? "Client success" : "Agency operations";
  const roleMessage = role === "client" ? "Track campaigns, requests, and billing in one place." : role === "moderator" ? "Keep requests, communication, and campaign health moving." : "Approvals, campaign health, and billing follow-ups for today.";
  const staleCampaigns = campaigns.filter((item) => item.isStale || item.status === "failed");
  const sourceLabel = facebookOverview?.source === "facebook-graph-and-stored-data" ? "Facebook + CRM" : "CRM records";
  const trend = campaigns.slice(0, 8).reverse().map((item, index) => ({ name: item.name?.slice(0, 12) || `C${index + 1}`, spend: item.performance?.spend || 0 }));
  const overview = facebookOverview?.overview;
  const kpis = [
    { label: "Active campaigns", value: String(activeCampaigns.length), meta: `${campaigns.length} total`, icon: Megaphone, tone: "bg-emerald-50 text-emerald-700", href: "/campaigns", feature: "campaigns" },
    { label: "Pending approvals", value: String(pendingRequests.length), meta: pendingRequests.length ? "Waiting for review" : "Queue is clear", icon: FileText, tone: "bg-amber-50 text-amber-700", href: "/requests", feature: "requests" },
    { label: "Outstanding", value: formatInvoiceTotals(unpaidInvoices, fallbackCurrency), meta: `${overdueInvoices.length} overdue`, icon: WalletCards, tone: "bg-rose-50 text-rose-700", href: "/billing", feature: "billing" },
    { label: "Active clients", value: String(activeClients.length), meta: `${clients.length} records`, icon: Users, tone: "bg-blue-50 text-blue-700", href: "/clients", feature: "clients" },
  ].filter((item) => canOpen(item.feature));
  const performance = overview ? [
    { label: "Ad spend", value: overview.spendByCurrency && Object.keys(overview.spendByCurrency).length ? Object.entries(overview.spendByCurrency).map(([code, amount]) => formatMoney(amount, code)).join(" · ") : formatMoney(overview.spend, overview.currency || fallbackCurrency) },
    { label: "Impressions", value: formatCount(overview.impressions) },
    { label: "Results", value: formatCount(overview.results) },
    { label: "CPA", value: Object.keys(overview.spendByCurrency || {}).length > 1 ? "—" : formatMoney(overview.cpa, overview.currency || fallbackCurrency) },
  ] : [];
  const itemCount = pendingRequests.length + overdueInvoices.length + staleCampaigns.length;

  return (
    <div className="space-y-6 text-slate-900">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{roleLabel}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Workspace overview</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-500">{roleMessage}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canOpen("requests") && <Link to="/requests" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1d4ed8] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1e40af]">Review requests<ArrowRight className="size-4" /></Link>}
          {canOpen("campaigns") && <Link to="/campaigns" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Campaign health</Link>}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, meta, icon: Icon, tone, href }) => (
          <Link to={href} key={label} className="group">
            <Card className="h-full p-5 transition group-hover:border-blue-200 group-hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="size-4" /></div>
              </div>
              <p className={`mt-4 font-semibold tracking-tight text-slate-900 ${value.length > 16 ? "text-lg" : "text-2xl"}`}>{value}</p>
              <p className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>{meta}</span><ArrowUpRight className="size-4 text-slate-300 group-hover:text-blue-600" /></p>
            </Card>
          </Link>
        ))}
      </section>

      {performance.length > 0 && (
        <section className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:grid-cols-4">
          {performance.map((item) => (
            <div key={item.label} className="px-2 py-1">
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{item.value}</p>
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-5">
        {canOpen("campaigns") && <Card className="p-5 xl:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Campaign spend</h3>
              <p className="mt-1 text-sm text-slate-500">Spend across the latest campaigns</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{fallbackCurrency}</span>
          </div>
          {trend.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: -12, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="spend" stroke="#2563eb" strokeWidth={2} fill="url(#spendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
              <Megaphone className="size-5" />Campaign spend will appear here.
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-500">Data source</span>
            <span className="font-medium text-slate-700">{sourceLabel}</span>
          </div>
        </Card>}

        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">Needs attention</h3>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{itemCount}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">What to handle next</p>
            </div>
            {!featuresConfigured && <Link to="/updates" className="text-sm font-medium text-blue-700 hover:text-blue-800">Updates</Link>}
          </div>
          <div className="divide-y divide-slate-100">
            {canOpen("requests") && pendingRequests.slice(0, 3).map((item) => (
              <Link to="/requests" key={item._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Clock3 className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{item.requestNumber} · {item.pageName}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{item.client?.name || "Unassigned client"} · {Array.isArray(item.objective) ? item.objective.join(", ") : item.objective}</p>
                </div>
                <StatusBadge tone={requestTone(item.status)}>{item.status}</StatusBadge>
              </Link>
            ))}
            {canOpen("billing") && overdueInvoices.slice(0, 2).map((item) => (
              <Link to="/billing" key={item._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700"><CircleDollarSign className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{item.invoiceNumber} · {item.client?.name || item.pageName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Payment follow-up required</p>
                </div>
                <span className="text-sm font-semibold text-rose-700">{formatMoney(item.amount, item.currency)}</span>
              </Link>
            ))}
            {canOpen("campaigns") && staleCampaigns.slice(0, 2).map((item) => (
              <Link to="/campaigns" key={item._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700"><RefreshCw className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.isStale ? "Sync is stale" : "Campaign delivery failed"}</p>
                </div>
                <StatusBadge tone={campaignTone(item.status)}>{item.status}</StatusBadge>
              </Link>
            ))}
            {!itemCount && (
              <div className="flex items-center gap-3 px-5 py-10 text-sm text-slate-500">
                <CheckCircle2 className="size-5 text-emerald-600" />Everything that needs a decision is clear.
              </div>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        {canOpen("clients") && <Card className="xl:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Client pulse</h3>
              <p className="mt-1 text-sm text-slate-500">Active accounts and spend to date</p>
            </div>
            <Link to="/clients" className="text-sm font-medium text-blue-700 hover:text-blue-800">View clients</Link>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {activeClients.slice(0, 6).map((client) => (
              <Link to="/clients" key={client._id} className="rounded-xl border border-slate-200 p-3.5 transition hover:border-blue-200 hover:bg-blue-50/40">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: client.color || "#2563eb" }}>{client.name.slice(0, 2).toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{client.name}</p>
                    <p className="truncate text-xs text-slate-500">{client.activeCampaigns} active campaigns</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Spend to date</span>
                  <span className="font-semibold text-slate-800">{formatMoney(client.totalSpend, fallbackCurrency)}</span>
                </div>
              </Link>
            ))}
            {!activeClients.length && <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-sm text-slate-500 sm:col-span-2"><Users className="size-5" />Active clients will show up here.</div>}
          </div>
        </Card>}

        {canOpen("requests") && <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Recent requests</h3>
              <p className="mt-1 text-sm text-slate-500">Latest pipeline activity</p>
            </div>
            <Link to="/requests" className="text-sm font-medium text-blue-700 hover:text-blue-800">View queue</Link>
          </div>
          {requests.length ? (
            <div className="divide-y divide-slate-100">
              {requests.slice(0, 5).map((item) => (
                <Link to="/requests" key={item._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{item.requestNumber}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{item.client?.name || item.pageName}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge tone={requestTone(item.status)}>{item.status}</StatusBadge>
                    <p className="mt-1 text-[11px] text-slate-400">{formatDate(item.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-sm text-slate-500"><FileText className="size-5" />No requests have been submitted.</div>
          )}
        </Card>}
      </section>
    </div>
  );
}
