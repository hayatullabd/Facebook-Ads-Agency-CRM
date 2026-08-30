import { useEffect, useState, type FormEvent } from "react";
import { Building2, Facebook, ScrollText, Users } from "lucide-react";
import { apiRequest } from "../../../lib/api";
import { formatDate } from "../../../lib/formatters";
import type { ActivityLog, AgencyProfile, UserAccount } from "../../../types/crm";
import { Card } from "../../shared/Card";
import { getAgency, saveAgencySettings, saveFacebookSettings } from "../settingsApi";

export function SettingsPage({ agencyId, onWorkspaceRefresh }: { agencyId: string; onWorkspaceRefresh: () => Promise<boolean> }) {
  const [tab, setTab] = useState<"General" | "API Config" | "Team" | "Audit Logs">("General");
  const [agency, setAgency] = useState<AgencyProfile | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<AgencyProfile["defaultCurrency"]>("USD");
  const [rate, setRate] = useState("1");
  const [accessToken, setAccessToken] = useState("");
  const [adAccount, setAdAccount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    Promise.all([getAgency(agencyId), apiRequest<UserAccount[]>(`/users/${agencyId}`), apiRequest<ActivityLog[]>(`/logs/${agencyId}`)])
      .then(([profile, team, audit]) => {
        setAgency(profile); setUsers(team); setLogs(audit); setName(profile.name);
        setCurrency(profile.defaultCurrency); setRate(String(profile.defaultRate));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load workspace settings"));
  }, [agencyId]);

  const saveGeneral = async (event: FormEvent) => {
    event.preventDefault(); setBusy("general"); setError(""); setMessage("");
    try {
      await saveAgencySettings(agencyId, { name: name.trim(), defaultCurrency: currency, defaultRate: Number(rate) });
      setAgency(await getAgency(agencyId)); await onWorkspaceRefresh(); setMessage("Agency profile saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Agency profile could not be saved"); }
    finally { setBusy(""); }
  };

  const saveFacebook = async (event: FormEvent) => {
    event.preventDefault(); setBusy("facebook"); setError(""); setMessage("");
    try {
      await saveFacebookSettings(agencyId, { accessToken: accessToken.trim(), defaultAdAccountId: adAccount.trim() || undefined });
      setAccessToken(""); await onWorkspaceRefresh(); setMessage("Facebook access token saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Facebook settings could not be saved"); }
    finally { setBusy(""); }
  };

  const tabs = [{ label: "General", icon: Building2 }, { label: "API Config", icon: Facebook }, { label: "Team", icon: Users }, { label: "Audit Logs", icon: ScrollText }] as const;
  return <div className="crm-light-portal settings-light space-y-4 rounded bg-slate-50 p-3 text-slate-900 sm:p-4">
    <div className="crm-page-header"><div className="crm-page-header-main"><div className="crm-page-header-tab"><h2 className="crm-page-title">Agency Profile</h2></div><div className="crm-page-header-meta"><p className="crm-page-subtitle">Workspace identity, integrations, team access, and audit history</p></div></div></div>
    {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    {message && <div role="status" className="rounded border border-green-200 bg-green-50 p-3 text-xs text-green-700">{message}</div>}
    <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4 sm:col-span-2"><p className="text-xs text-gray-500">Agency name</p><p className="mt-1 text-lg font-bold text-[#1e40af]">{agency?.name || "Loading..."}</p><p className="mt-2 text-xs text-gray-500">Agency ID: <span className="font-mono">{agency?._id || "—"}</span></p></Card><Card className="p-4"><p className="text-xs text-gray-500">Default currency</p><p className="mt-1 text-lg font-bold">{agency?.defaultCurrency || "—"}</p><p className="mt-2 text-xs text-gray-500">Default rate: {agency?.defaultRate ?? "—"}</p></Card></div>
    <div className="flex flex-wrap gap-1 border-b border-[#1e40af]">{tabs.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => setTab(label)} className={`inline-flex items-center gap-2 rounded-t border border-b-0 px-4 py-2 text-xs font-bold ${tab === label ? "border-[#1e40af] bg-[#1e40af] text-white" : "border-gray-300 bg-gray-100 text-[#1e40af] hover:bg-gray-200"}`}><Icon className="size-3.5" />{label}</button>)}</div>
    <Card className="rounded-tl-none p-4">
      {tab === "General" && <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveGeneral}><label><span className="crm-label">Agency name</span><input required className="crm-input" value={name} onChange={(event) => setName(event.target.value)} /></label><label><span className="crm-label">Default currency</span><select className="crm-input" value={currency} onChange={(event) => setCurrency(event.target.value as AgencyProfile["defaultCurrency"])}><option>USD</option><option>BDT</option><option>INR</option></select></label><label><span className="crm-label">Default rate</span><input required min="0" step="0.01" type="number" className="crm-input" value={rate} onChange={(event) => setRate(event.target.value)} /></label><div className="flex items-end"><button disabled={busy === "general"} className="rounded border border-[#1e40af] bg-[#1e40af] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === "general" ? "Saving..." : "Save profile"}</button></div></form>}
      {tab === "API Config" && <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveFacebook}><label className="sm:col-span-2"><span className="crm-label">Facebook access token</span><textarea required rows={4} className="crm-input" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="Paste a valid system user token" /></label><label><span className="crm-label">Default ad account ID</span><input className="crm-input" value={adAccount} onChange={(event) => setAdAccount(event.target.value)} placeholder="act_123456789" /></label><div className="flex items-end"><button disabled={busy === "facebook" || !accessToken.trim()} className="rounded border border-[#1e40af] bg-[#1e40af] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === "facebook" ? "Saving..." : "Save access token"}</button></div></form>}
      {tab === "Team" && <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-xs"><thead className="bg-[#eef2f6] text-[#1e40af]"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{users.map((user) => <tr key={user._id} className="border-b border-gray-200"><td className="px-3 py-2 font-semibold">{user.name}</td><td className="px-3 py-2">{user.email}</td><td className="px-3 py-2 capitalize">{user.role}</td><td className="px-3 py-2">{user.isActive ? "Active" : "Inactive"}</td></tr>)}</tbody></table>{!users.length && <p className="p-6 text-center text-sm text-gray-500">No team members found.</p>}</div>}
      {tab === "Audit Logs" && <div className="divide-y divide-gray-200">{logs.length ? logs.map((log) => <div key={log._id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-[#1e40af]">{log.action}</p><p className="text-xs text-gray-600">{log.detail}</p><p className="mt-1 text-[11px] text-gray-400">By {log.actor?.name || "System"}</p></div><time className="text-xs text-gray-500">{formatDate(log.createdAt)}</time></div>) : <p className="p-6 text-center text-sm text-gray-500">No audit logs found.</p>}</div>}
    </Card>
  </div>;
}
