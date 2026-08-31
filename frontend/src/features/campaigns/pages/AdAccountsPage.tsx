import { useMemo, useState } from "react";
import { BriefcaseBusiness, Search } from "lucide-react";
import type { Client, FacebookAdAccount } from "../../../types/crm";
import { formatMoney } from "../../../lib/formatters";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";

export function AdAccountsPage({ accounts, clients }: { accounts: FacebookAdAccount[]; clients: Client[] }) {
  const [search, setSearch] = useState("");
  const assignments = useMemo(() => new Map(accounts.map((account) => [account.facebookAdAccountId, clients.filter((client) => client.facebookAdAccountIds?.includes(account.facebookAdAccountId)).map((client) => client.name)])), [accounts, clients]);
  const filtered = accounts.filter((account) => !search.trim() || [account.name, account.facebookAdAccountId, account.currency, account.timezoneName].some((value) => value?.toLowerCase().includes(search.toLowerCase())));

  return <div className="crm-light-portal crm-design-shell space-y-4 text-[#17243b]">
    <div className="crm-page-header"><div className="crm-page-header-main"><div className="crm-page-header-tab"><h2 className="crm-page-title">Ad Accounts</h2></div><div className="crm-page-header-meta"><p className="crm-page-subtitle">Discovered Facebook account inventory and client assignments</p></div></div></div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><input className="crm-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ad accounts" /></div><p className="text-xs font-semibold text-gray-500">{filtered.length} of {accounts.length} accounts</p></div>
    <Card className="overflow-x-auto">
      {filtered.length ? <table className="w-full min-w-[900px] border-collapse text-left text-xs"><thead className="bg-[#1e40af] text-white"><tr>{["Account", "Account ID", "Status", "Currency", "Amount Spent", "Timezone", "Assigned Clients"].map((label) => <th key={label} className="border-r border-[#1e3a8a] px-3 py-2.5 font-bold last:border-r-0">{label}</th>)}</tr></thead><tbody>{filtered.map((account) => { const assigned = assignments.get(account.facebookAdAccountId) || []; return <tr key={account.facebookAdAccountId} className="border-b border-gray-200 hover:bg-gray-50"><td className="border-r border-gray-200 px-3 py-2 font-semibold">{account.name}</td><td className="border-r border-gray-200 px-3 py-2 font-mono text-gray-600">{account.facebookAdAccountId}</td><td className="border-r border-gray-200 px-3 py-2"><StatusBadge tone={account.isAccessible ? "success" : "danger"}>{account.isAccessible ? "Accessible" : "Unavailable"}</StatusBadge></td><td className="border-r border-gray-200 px-3 py-2">{account.currency || "—"}</td><td className="border-r border-gray-200 px-3 py-2 text-right">{account.amountSpent == null ? "—" : formatMoney(account.amountSpent, account.currency)}</td><td className="border-r border-gray-200 px-3 py-2 text-gray-600">{account.timezoneName || "—"}</td><td className="px-3 py-2">{assigned.length ? assigned.join(", ") : <span className="text-gray-400">Unassigned</span>}</td></tr>; })}</tbody></table> : <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500"><BriefcaseBusiness className="size-5" />No ad accounts match this view.</div>}
    </Card>
  </div>;
}
