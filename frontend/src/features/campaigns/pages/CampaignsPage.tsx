import { useEffect, useMemo, useState } from "react";
import { Link2, Megaphone, Pause, Play, Search, X } from "lucide-react";
import type { Campaign, Client, FacebookAdAccount, Role } from "../../../types/crm";
import { formatMoney } from "../../../lib/formatters";
import { Button } from "../../shared/Button";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";

type Props = {
  campaigns: Campaign[];
  accounts: FacebookAdAccount[];
  clients: Client[];
  role: Role;
  onUpdateCampaign: (id: string, payload: Partial<Campaign>) => Promise<void>;
  onAssignCampaignClient: (campaignId: string, clientId: string | null) => Promise<void>;
  onAssignClientAdAccount: (clientId: string, accountId: string, assigned: boolean) => Promise<void>;
};

export function CampaignsPage({ campaigns, accounts, clients, role, onUpdateCampaign, onAssignCampaignClient, onAssignClientAdAccount }: Props) {
  const [search, setSearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [selected, setSelected] = useState("all");
  const [mappingOpen, setMappingOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const canManage = role === "admin" || role === "team";

  const options = useMemo(() => {
    const map = new Map(accounts.map((account) => [account.facebookAdAccountId, account]));
    for (const campaign of campaigns) {
      if (campaign.facebookAdAccountId && !map.has(campaign.facebookAdAccountId)) {
        map.set(campaign.facebookAdAccountId, { facebookAdAccountId: campaign.facebookAdAccountId, accountId: campaign.facebookAdAccountId.replace(/^act_/, ""), name: campaign.facebookAdAccountName || "", isAccessible: true });
      }
    }
    const query = accountSearch.toLowerCase();
    return [...map.values()].filter((account) => !query || account.name.toLowerCase().includes(query) || account.facebookAdAccountId.toLowerCase().includes(query));
  }, [accounts, campaigns, accountSearch]);

  const filtered = useMemo(() => campaigns.filter((campaign) =>
    (selected === "all" || campaign.facebookAdAccountId === selected) &&
    (!search.trim() || [campaign.name, campaign.objective, campaign.client?.name, campaign.facebookAdAccountName, campaign.facebookAdAccountId].some((value) => value?.toLowerCase().includes(search.toLowerCase())))
  ), [campaigns, search, selected]);

  useEffect(() => {
    if (!mappingOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMappingOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mappingOpen]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : "Could not save mapping"); } finally { setBusy(""); }
  };

  const changeAccountOwner = async (accountId: string, currentOwnerId: string, nextOwnerId: string) => {
    if (currentOwnerId === nextOwnerId) return;
    if (nextOwnerId) await run(`account-${accountId}`, () => onAssignClientAdAccount(nextOwnerId, accountId, true));
    else if (currentOwnerId) await run(`account-${accountId}`, () => onAssignClientAdAccount(currentOwnerId, accountId, false));
  };

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="crm-page-title">Campaigns</h2><p className="crm-page-subtitle">Performance by Facebook ad account and CRM source</p></div>
      {canManage && <Button onClick={() => setMappingOpen(true)}><Link2 className="size-4" />Map ad accounts</Button>}
    </div>
    {error && <div role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
    <Card>
      <div className="grid gap-3 border-b border-[#20293a] p-3 md:grid-cols-3">
        <div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600"/><input aria-label="Search campaigns" className="crm-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campaigns..."/></div>
        <div className="space-y-2"><input aria-label="Search ad accounts" className="crm-input" value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Search account name or ID"/><select aria-label="Filter by ad account" className="crm-input" value={selected} onChange={(event) => setSelected(event.target.value)}><option value="all">All Ad Accounts</option>{options.map((account) => <option key={account.facebookAdAccountId} value={account.facebookAdAccountId}>{account.name || "Unnamed account"} · {account.facebookAdAccountId}</option>)}</select></div>
      </div>
      {filtered.length ? <div className="crm-responsive-table overflow-x-auto"><table className="w-full"><thead className="crm-table-head"><tr><th className="px-4 py-3">Campaign</th><th className="px-4 py-3">Ad account</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Spend</th><th className="px-4 py-3">Reach</th><th className="px-4 py-3">Results</th><th className="px-4 py-3">Status</th>{canManage && <th className="px-4 py-3 text-right">Action</th>}</tr></thead><tbody>{filtered.map((campaign) => <tr key={campaign._id} className="hover:bg-white/[0.02]">
        <td className="crm-table-cell"><p className="font-semibold text-slate-200">{campaign.name}</p><p className="text-xs text-slate-500">{campaign.objective || campaign.facebookObjective || "No objective"} · {campaign.platform}</p><span className="mt-1 inline-flex rounded border border-[#263044] px-1.5 py-0.5 text-[10px] uppercase text-slate-400">{campaign.source || "crm"}</span></td>
        <td className="crm-table-cell"><p>{campaign.facebookAdAccountName || "—"}</p><p className="font-mono text-xs text-slate-500">{campaign.facebookAdAccountId || "CRM campaign"}</p></td>
        <td className="crm-table-cell">{canManage && campaign.source === "facebook" ? <label className="block"><span className="mb-1 block text-[10px] uppercase text-slate-500">Campaign only</span><select aria-label={`Campaign only client for ${campaign.name}`} className="crm-input min-w-36" value={campaign.client?._id || ""} disabled={busy === `campaign-${campaign._id}`} onChange={(event) => void run(`campaign-${campaign._id}`, () => onAssignCampaignClient(campaign._id, event.target.value || null))}><option value="">Unassigned</option>{clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}</select></label> : campaign.client?.name || "Unassigned"}</td>
        <td className="crm-table-cell font-semibold text-slate-200">{formatMoney(campaign.performance.spend, campaign.budget?.currency || "USD")}</td><td className="crm-table-cell">{campaign.performance.reach.toLocaleString()}</td><td className="crm-table-cell"><span className="text-blue-400">{campaign.performance.results.toLocaleString()}</span><p className="text-xs text-slate-500">{formatMoney(campaign.performance.costPerResult, campaign.budget?.currency || "USD")} CPR</p></td><td className="crm-table-cell"><StatusBadge tone={campaign.isStale ? "warning" : campaign.status === "active" ? "success" : campaign.status === "paused" ? "warning" : campaign.status === "failed" ? "danger" : "default"}>{campaign.isStale ? "stale" : campaign.status}</StatusBadge></td>
        {canManage && <td className="crm-table-cell"><div className="flex justify-end">{campaign.source !== "facebook" && <button disabled={busy === campaign._id} onClick={() => void run(campaign._id, () => onUpdateCampaign(campaign._id, { status: campaign.status === "active" ? "paused" : "active" }))} className="crm-icon-button" aria-label={campaign.status === "active" ? `Pause ${campaign.name}` : `Start ${campaign.name}`}>{campaign.status === "active" ? <Pause className="size-3.5"/> : <Play className="size-3.5"/>}</button>}</div></td>}
      </tr>)}</tbody></table></div> : <div className="crm-empty"><Megaphone className="size-5"/>{selected !== "all" ? "No campaigns in the selected account." : "No campaigns found."}</div>}
    </Card>
    {mappingOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMappingOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="account-mapping-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#263044] bg-[#0d121e] shadow-2xl">
      <div className="sticky top-0 flex items-start justify-between border-b border-[#20293a] bg-[#0d121e] p-4"><div><h3 id="account-mapping-title" className="font-semibold text-slate-100">Facebook account mapping</h3><p className="mt-1 text-sm text-slate-400">Assigning an account shares all current and future campaigns with that client.</p></div><button className="crm-icon-button" onClick={() => setMappingOpen(false)} aria-label="Close account mapping"><X className="size-4"/></button></div>
      <div className="space-y-3 p-4"><input autoFocus aria-label="Search accounts to map" className="crm-input" value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Search account name or act_ ID"/>{options.length ? options.map((account) => { const owner = clients.find((client) => (client.facebookAdAccountIds || []).includes(account.facebookAdAccountId)); return <div key={account.facebookAdAccountId} className="grid gap-3 rounded-md border border-[#263044] p-3 sm:grid-cols-[1fr_16rem] sm:items-center"><div><p className="font-medium text-slate-200">{account.name || "Unnamed account"}</p><p className="font-mono text-xs text-slate-500">{account.facebookAdAccountId}{account.isAccessible === false ? " · historical" : ""}</p></div><label><span className="crm-label">Account owner</span><select className="crm-input" aria-label={`Owner for ${account.name || account.facebookAdAccountId}`} value={owner?._id || ""} disabled={busy === `account-${account.facebookAdAccountId}`} onChange={(event) => void changeAccountOwner(account.facebookAdAccountId, owner?._id || "", event.target.value)}><option value="">Unassigned</option>{clients.map((client) => <option key={client._id} value={client._id} disabled={Boolean(owner && owner._id !== client._id)}>{client.name}</option>)}</select></label></div>; }) : <div className="crm-empty">No Facebook accounts found.</div>}</div>
    </section></div>}
  </div>;
}
