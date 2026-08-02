import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, RefreshCw, Settings2 } from "lucide-react";
import type { FacebookOverview } from "../../../types/crm";
import { formatMoney } from "../../../lib/formatters";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";
import { Button } from "../../shared/Button";
import { getAgency, getFacebookOverview, saveAgencySettings, saveFacebookSettings, syncFacebookOverview } from "../settingsApi";

export function SettingsPage({ agencyId }: { agencyId: string }) {
  const [agencyName, setAgencyName] = useState("");
  const [defaultRate, setDefaultRate] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [account, setAccount] = useState("");
  const [overview, setOverview] = useState<FacebookOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [agency, facebook] = await Promise.all([getAgency(agencyId), getFacebookOverview(agencyId)]);
      setAgencyName(agency.name);
      setDefaultRate(String(agency.defaultRate));
      setOverview(facebook);
      setAccount(facebook.connection.adAccountId || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [agencyId]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveAgencySettings(agencyId, { name: agencyName, defaultRate: Number(defaultRate) });
      if (accessToken.trim()) {
        await saveFacebookSettings(agencyId, { accessToken, defaultAdAccountId: account });
      }
      setAccessToken("");
      await load();
      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const result = await syncFacebookOverview(agencyId);
      setOverview(result.overview);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync Facebook data");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div><h2 className="crm-page-title">Workspace settings</h2><p className="crm-page-subtitle">Agency defaults and Facebook API connection</p></div>
      {error && <div role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {message && <div role="status" className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"><CheckCircle2 className="size-4" />{message}</div>}
      {loading ? <Card className="p-5 text-sm text-slate-400">Loading agency settings...</Card> : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-5 flex items-start justify-between"><div><h3 className="font-semibold">Agency profile</h3><p className="text-xs text-slate-400">Workspace naming and billing defaults</p></div><Settings2 className="size-5 text-blue-400" /></div>
              <div className="space-y-4">
                <label><span className="crm-label">Agency name</span><input required className="crm-input" value={agencyName} onChange={(event) => setAgencyName(event.target.value)} /></label>
                <label><span className="crm-label">Default billing rate</span><input required min="1" type="number" className="crm-input" value={defaultRate} onChange={(event) => setDefaultRate(event.target.value)} /></label>
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-5 flex items-start justify-between"><div><h3 className="font-semibold">Facebook API</h3><p className="text-xs text-slate-400">Credentials are stored by the server</p></div><StatusBadge tone={overview?.connection.status === "connected" ? "success" : "danger"}>{overview?.connection.status || "unavailable"}</StatusBadge></div>
              <div className="space-y-4">
                <label><span className="crm-label">Ad account ID</span><input className="crm-input" value={account} onChange={(event) => setAccount(event.target.value)} placeholder="act_..." /></label>
                <label><span className="crm-label">Access token</span><input type="password" autoComplete="off" className="crm-input" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="Leave blank to keep existing token" /></label>
                <button type="button" onClick={() => void sync()} disabled={syncing} className="inline-flex items-center gap-2 rounded-md border border-[#263044] bg-[#0d121e] px-3 py-2 text-sm text-slate-300 disabled:opacity-50"><RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Syncing..." : "Sync Facebook"}</button>
              </div>
            </Card>
          </div>
          <Card className="p-5">
            <h3 className="font-semibold">Connection overview</h3>
            <p className="mt-1 text-xs text-slate-400">{overview?.source === "facebook-graph-and-stored-data" ? "Facebook Graph API and stored CRM data" : "Stored CRM data only"}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[["Ad account", overview?.connection.adAccountId || "Not connected"], ["Spend", formatMoney(overview?.overview.spend || 0, overview?.overview.currency)], ["Campaigns", String(overview?.overview.campaignCount || 0)], ["API usage", overview ? `${overview.overview.usage.callsUsed}/${overview.overview.usage.callsLimit}` : "Not available"]].map(([label, value]) => <div key={label} className="rounded-md border border-[#20293a] bg-[#0a0e17] p-3"><p className="text-[10px] uppercase text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-200">{value}</p></div>)}
            </div>
          </Card>
          <div className="flex justify-end"><Button disabled={saving || !agencyName.trim() || !defaultRate}>{saving ? "Saving..." : "Save Settings"}</Button></div>
        </>
      )}
    </form>
  );
}
