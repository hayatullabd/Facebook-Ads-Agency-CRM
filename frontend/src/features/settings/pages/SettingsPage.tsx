import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../../../lib/api";
import { formatDate } from "../../../lib/formatters";
import type { ActivityLog, AgencyProfile, FacebookOverview, Role, UserAccount } from "../../../types/crm";
import type { AuthUser } from "../../auth/authApi";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";
import { TEAM_FEATURE_OPTIONS, TeamFeatureChecklist, teamFeatureLabel } from "../../users/TeamFeatureChecklist";
import { createUser, updateUser } from "../../users/usersApi";
import { disconnectFacebook, getAgency, getFacebookOverview, saveAgencySettings, saveFacebookSettings } from "../settingsApi";
import { AgencyPaymentDetailsPanel } from "../../billing/AgencyPaymentDetails";

type SettingsTab = "workspace" | "facebook" | "payments" | "team" | "activity";
type Connection = FacebookOverview["connection"];

const tabs: { id: SettingsTab; label: string }[] = [
  { id: "workspace", label: "Workspace" },
  { id: "facebook", label: "Facebook" },
  { id: "payments", label: "Payments" },
  { id: "team", label: "Team" },
  { id: "activity", label: "Activity" },
];

export function SettingsPage({ agencyId, onWorkspaceRefresh, platformRole, user }: { agencyId: string; onWorkspaceRefresh: () => Promise<boolean>; platformRole?: string; user: AuthUser }) {
  const [tab, setTab] = useState<SettingsTab>("workspace");
  const [agency, setAgency] = useState<AgencyProfile | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [name, setName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [adAccount, setAdAccount] = useState("");
  const [member, setMember] = useState({ name: "", email: "", password: "", role: "team" as Role, features: [] as string[] });
  const [accessEdit, setAccessEdit] = useState("");
  const [accessFeatures, setAccessFeatures] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (platformRole === "admin") return;
    let cancelled = false;
    Promise.all([getAgency(agencyId), apiRequest<UserAccount[]>(`/users/${agencyId}`), apiRequest<ActivityLog[]>(`/logs/${agencyId}`)])
      .then(([profile, team, audit]) => {
        if (cancelled) return;
        setAgency(profile);
        setUsers(team);
        setLogs(audit);
        setName(profile.name);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load workspace settings");
      });
    getFacebookOverview(agencyId)
      .then((overview) => {
        if (cancelled) return;
        setConnection(overview.connection);
        setAdAccount((current) => current || overview.connection.adAccountId || "");
      })
      .catch(() => {
        if (!cancelled) setConnection(null);
      });
    return () => { cancelled = true; };
  }, [agencyId, platformRole]);

  const saveGeneral = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("general");
    setError("");
    setMessage("");
    try {
      await saveAgencySettings(agencyId, { name: name.trim() });
      setAgency(await getAgency(agencyId));
      await onWorkspaceRefresh();
      setMessage("Workspace profile saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Agency profile could not be saved");
    } finally {
      setBusy("");
    }
  };

  const saveFacebook = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("facebook");
    setError("");
    setMessage("");
    try {
      await saveFacebookSettings(agencyId, { accessToken: accessToken.trim(), defaultAdAccountId: adAccount.trim() || undefined });
      setAccessToken("");
      const overview = await getFacebookOverview(agencyId);
      setConnection(overview.connection);
      setAdAccount(overview.connection.adAccountId || adAccount);
      await onWorkspaceRefresh();
      setMessage("Facebook connection saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Facebook settings could not be saved");
    } finally {
      setBusy("");
    }
  };

  const revokeFacebook = async () => {
    if (!connection?.isConnected) return;
    if (!window.confirm("Revoke Facebook access? AdFlow will delete the saved token and ask Facebook to remove this app's permissions. Saved campaign history stays.")) return;
    setBusy("revoke");
    setError("");
    setMessage("");
    try {
      const result = await disconnectFacebook(agencyId, true);
      const overview = await getFacebookOverview(agencyId);
      setConnection(overview.connection);
      setAccessToken("");
      setAdAccount("");
      await onWorkspaceRefresh();
      setMessage(result.remoteRevoked ? "Facebook access revoked." : "Facebook token removed here. Facebook did not confirm the revoke, so remove the app in Business Manager if it still shows.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Facebook access could not be revoked");
    } finally {
      setBusy("");
    }
  };

  const addMember = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("member");
    setError("");
    setMessage("");
    try {
      await createUser(agencyId, { name: member.name.trim(), email: member.email.trim(), password: member.password, role: member.role, ...(member.role === "team" ? { features: member.features } : {}) });
      setUsers(await apiRequest<UserAccount[]>(`/users/${agencyId}`));
      setMember({ name: "", email: "", password: "", role: "team", features: [] });
      setMessage("Team member added.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add the team member");
    } finally {
      setBusy("");
    }
  };

  if (platformRole === "admin") {
    return <div className="space-y-3 text-slate-900">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Platform account</p>
        <h2 className="text-lg font-semibold text-slate-900">System profile</h2>
      </header>
      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <dl className="grid sm:grid-cols-3">
          <div className="border-b border-slate-100 px-4 py-3 sm:border-b-0 sm:border-r"><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Name</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{user.name}</dd></div>
          <div className="border-b border-slate-100 px-4 py-3 sm:border-b-0 sm:border-r"><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd className="mt-1 break-all text-sm font-semibold text-slate-900">{user.email}</dd></div>
          <div className="px-4 py-3"><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Access</dt><dd className="mt-1 text-sm font-semibold text-slate-900">SaaS owner</dd></div>
        </dl>
      </section>
    </div>;
  }

  const connected = Boolean(connection?.isConnected);
  const facts = [
    { label: "Agency", value: agency?.name || "Loading...", meta: agency?.slug || "Workspace" },
    { label: "Team", value: String(users.length), meta: `${users.filter((person) => person.isActive).length} active` },
    { label: "Facebook", value: connected ? "Connected" : "Not connected", meta: connection?.accountCount ? `${connection.accountCount} ad accounts` : "No ad account yet" },
  ];

  return <div className="space-y-3 text-slate-900">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Agency workspace</p>
        <h2 className="text-lg font-semibold text-slate-900">System profile</h2>
      </div>
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1">
        {tabs.map(({ id, label }) => <button key={id} type="button" aria-pressed={tab === id} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${tab === id ? "bg-white text-[#1d4ed8] shadow-sm" : "text-slate-600 hover:text-slate-900"}`} onClick={() => { setTab(id); setError(""); setMessage(""); }}>{label}</button>)}
      </div>
    </header>

    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}

    <section className="grid gap-3 sm:grid-cols-3">
      {facts.map((fact) => <Card key={fact.label} className="p-4">
        <p className="text-xs font-medium text-slate-500">{fact.label}</p>
        <p className="mt-2 truncate text-base font-semibold text-slate-900">{fact.value}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{fact.meta}</p>
      </Card>)}
    </section>

    {tab === "workspace" && <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Workspace</h3>
        <p className="mt-0.5 text-xs text-slate-500">The name shown across this workspace.</p>
      </div>
      <form className="grid gap-3 p-4 sm:grid-cols-[minmax(12rem,20rem)_auto] sm:items-end" onSubmit={saveGeneral}>
        <label><span className="crm-label">Agency name</span><input required className="crm-input" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <button disabled={busy === "general"} className="h-9 rounded bg-[#1d4ed8] px-3 text-xs font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50">{busy === "general" ? "Saving..." : "Save profile"}</button>
      </form>
    </section>}

    {tab === "payments" && <AgencyPaymentDetailsPanel agencyId={agencyId} canEdit />}

    {tab === "facebook" && <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <form className="grid gap-2 p-2 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.6fr)_11rem_auto] xl:items-end" onSubmit={saveFacebook}>
        <label><span className="crm-label">Access token</span><input required type="password" autoComplete="off" className="crm-input" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="System user token" /></label>
        <label><span className="crm-label">Ad account</span><input className="crm-input" value={adAccount} onChange={(event) => setAdAccount(event.target.value)} placeholder="act_123456789" /></label>
        <button disabled={busy === "facebook" || !accessToken.trim()} className="h-9 rounded bg-[#1d4ed8] px-3 text-xs font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50">{busy === "facebook" ? "Saving..." : "Save"}</button>
      </form>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-2 py-1.5 text-[11px] text-slate-500">
        <StatusBadge tone={connected ? "success" : "warning"}>{connected ? "Connected" : "Not connected"}</StatusBadge>
        <span>{connection?.adAccountId || "No default account"}</span>
        <span>{connection?.accountCount ?? 0} accounts</span>
        <span>{connection?.lastVerifiedAt ? `Checked ${formatDate(connection.lastVerifiedAt)}` : "Not checked"}</span>
        <button type="button" disabled={!connected || busy === "revoke"} className="ml-auto h-8 rounded border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" onClick={() => { void revokeFacebook(); }}>{busy === "revoke" ? "Revoking..." : "Revoke access"}</button>
      </div>
    </section>}

    {tab === "team" && <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <form className="space-y-3 border-b border-slate-200 p-3" onSubmit={addMember}>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(8rem,1fr)_minmax(11rem,1.3fr)_7rem_minmax(10rem,1fr)_auto] xl:items-end">
          <label><span className="crm-label">Name</span><input required minLength={2} maxLength={100} className="crm-input" value={member.name} onChange={(event) => setMember((current) => ({ ...current, name: event.target.value }))} /></label>
          <label><span className="crm-label">Email</span><input required type="email" className="crm-input" value={member.email} onChange={(event) => setMember((current) => ({ ...current, email: event.target.value }))} /></label>
          <label><span className="crm-label">Role</span><select className="crm-input" value={member.role} onChange={(event) => setMember((current) => ({ ...current, role: event.target.value as Role }))}>{user.role === "owner" && <option value="admin">Admin</option>}<option value="team">Team</option></select></label>
          <label><span className="crm-label">Password</span><input required minLength={12} type="password" autoComplete="new-password" className="crm-input" title="12+ characters with uppercase, lowercase, number, and a symbol" value={member.password} onChange={(event) => setMember((current) => ({ ...current, password: event.target.value }))} /></label>
          <button disabled={busy === "member"} className="h-9 rounded bg-[#1d4ed8] px-3 text-xs font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50">{busy === "member" ? "Adding..." : "Add member"}</button>
        </div>
        {member.role === "team" && <TeamFeatureChecklist value={member.features} onChange={(features) => setMember((current) => ({ ...current, features }))} />}
      </form>
      <p className="border-b border-slate-100 px-2 py-1.5 text-[11px] text-slate-500">Password needs 12+ characters, with uppercase, lowercase, a number, and a symbol.</p>
      <div className="overflow-x-auto"><table className="crm-compact-table min-w-[760px]"><thead className="crm-table-head"><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th>Status</th><th>Joined</th></tr></thead><tbody>{users.length ? users.map((person) => <tr key={person._id}><td className="crm-table-cell font-semibold text-slate-800">{person.name}</td><td className="crm-table-cell text-slate-600">{person.email}</td><td className="crm-table-cell capitalize text-slate-700">{person.role}</td><td className="crm-table-cell text-slate-600">{person.role !== "team" ? "Full access" : accessEdit === person._id ? <div className="space-y-2"><TeamFeatureChecklist value={accessFeatures} onChange={setAccessFeatures} /><button type="button" disabled={busy === person._id} className="h-8 rounded bg-[#1d4ed8] px-2 text-[11px] font-semibold text-white disabled:opacity-50" onClick={() => { void (async () => { setBusy(person._id); setError(""); try { await updateUser(agencyId, person._id, { features: accessFeatures }); setUsers(await apiRequest<UserAccount[]>(`/users/${agencyId}`)); setAccessEdit(""); setMessage("Feature access saved."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save feature access"); } finally { setBusy(""); } })(); }}>{busy === person._id ? "Saving..." : "Save access"}</button></div> : <div className="space-y-1"><p>{person.featuresConfigured ? (person.features || []).filter((item) => item !== "dashboard").map(teamFeatureLabel).join(", ") || "Dashboard only" : "All features"}</p><button type="button" className="text-[11px] font-semibold text-[#1d4ed8] hover:underline" onClick={() => { setAccessEdit(person._id); setAccessFeatures(person.featuresConfigured ? (person.features || []).filter((item) => item !== "dashboard") : TEAM_FEATURE_OPTIONS.map((item) => item.id)); }}>Edit access</button></div>}</td><td className="crm-table-cell"><StatusBadge tone={person.isActive ? "success" : "default"}>{person.isActive ? "Active" : "Inactive"}</StatusBadge></td><td className="crm-table-cell text-slate-500">{formatDate(person.createdAt)}</td></tr>) : <tr><td className="crm-table-cell text-slate-500" colSpan={6}>No team members yet.</td></tr>}</tbody></table></div>
    </section>}

    {tab === "activity" && <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
        <p className="mt-0.5 text-xs text-slate-500">Recent changes in this workspace.</p>
      </div>
      {logs.length ? <div className="divide-y divide-slate-100">{logs.map((log) => <div key={log._id} className="flex items-start justify-between gap-4 px-4 py-3"><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{log.action}</p><p className="mt-0.5 text-xs text-slate-500">{log.detail}</p><p className="mt-1 text-[11px] text-slate-400">{log.actor?.name || "System"}</p></div><time className="shrink-0 text-xs text-slate-500">{formatDate(log.createdAt)}</time></div>)}</div> : <p className="px-4 py-8 text-sm text-slate-500">No activity yet.</p>}
    </section>}
  </div>;
}
