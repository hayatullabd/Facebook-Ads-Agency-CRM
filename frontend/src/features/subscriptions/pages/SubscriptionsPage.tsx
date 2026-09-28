import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, CheckCircle2, Pencil, Repeat, ShieldAlert, Trash2 } from "lucide-react";
import type { AgencyProfile, Role } from "../../../types/crm";
import { formatMoney } from "../../../lib/formatters";
import { isAgencyAdmin } from "../../../lib/permissions";
import { Card } from "../../shared/Card";
import { Button } from "../../shared/Button";
import { StatusBadge } from "../../shared/StatusBadge";
import { cancelAgencySubscription, createAgencySubscription, createSubscriptionPlan, deleteSubscriptionPlan, getAgencySubscriptions, getSubscriptionPlans, getSubscriptionSummary, resumeAgencySubscription, updateSubscriptionPlan, type Subscription, type SubscriptionPlan } from "../subscriptionsApi";

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan";

export function SubscriptionsPage({ agency, role, platformRole }: { agency: AgencyProfile | string; role: Role; platformRole?: string }) {
  const agencyId = typeof agency === "string" ? agency : agency._id;
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [planForm, setPlanForm] = useState({ name: "", price: "", currency: "USD" as SubscriptionPlan["currency"], clients: "0" });
  const [editingPlanId, setEditingPlanId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const isPlatform = platformRole === "admin";

  const load = async () => {
    if (platformRole === "admin") {
      setPlans(await getSubscriptionPlans());
      setError("");
      return;
    }
    const [planList, subscriptionList, summary] = await Promise.all([
      getSubscriptionPlans(),
      getAgencySubscriptions(agencyId),
      getSubscriptionSummary(agencyId),
    ]);
    setPlans(planList);
    setSubscriptions(subscriptionList);
    setActiveCount(summary.active);
    setError("");
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Could not load subscriptions"));
  }, [agencyId, platformRole]);

  const current = subscriptions[0] || null;
  const metrics = useMemo(() => [
    { label: "Active subscriptions", value: String(activeCount), icon: CheckCircle2 },
    { label: "Renewal date", value: current?.renewalAt ? new Date(current.renewalAt).toLocaleDateString() : "—", icon: CalendarClock },
    { label: "Plan status", value: current?.status || "—", icon: ShieldAlert },
  ], [activeCount, current]);

  const refreshAfter = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update subscription");
    } finally {
      setSaving(false);
    }
  };

  const canManagePlan = !isPlatform && isAgencyAdmin(role);
  const savePlan = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { name: planForm.name.trim(), slug: slugify(planForm.name), price: Number(planForm.price), currency: planForm.currency, limits: { clients: Math.max(0, Math.floor(Number(planForm.clients) || 0)) } };
      if (editingPlanId) await updateSubscriptionPlan(editingPlanId, payload);
      else await createSubscriptionPlan(payload);
      setEditingPlanId("");
      setPlanForm({ name: "", price: "", currency: planForm.currency, clients: "0" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the plan");
    } finally {
      setSaving(false);
    }
  };
  const startPlan = (planId: string) => refreshAfter(() => createAgencySubscription(agencyId, planId));
  const toggleSubscription = (subscription: Subscription) => refreshAfter(() => subscription.status === "active"
    ? cancelAgencySubscription(agencyId, subscription._id)
    : resumeAgencySubscription(agencyId, subscription._id));

  if (isPlatform) {
    return <div className="crm-light-portal crm-design-shell space-y-3 text-slate-900">
      <div className="crm-page-header"><div className="crm-page-header-main"><div className="crm-page-header-tab"><h2 className="crm-page-title">Subscriptions</h2></div><div className="crm-page-header-meta"><p className="crm-page-subtitle">Plans you assign when adding an agency</p></div></div></div>
      {error && <div role="alert" className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <form className="grid gap-2 border-b border-slate-200 p-2 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_6.5rem_6rem_6.5rem_auto] xl:items-end" onSubmit={savePlan}>
          <label><span className="crm-label">Plan name</span><input required minLength={2} maxLength={120} className="crm-input" value={planForm.name} onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label><span className="crm-label">Price</span><input required min="0" step="0.01" type="number" className="crm-input" value={planForm.price} onChange={(event) => setPlanForm((current) => ({ ...current, price: event.target.value }))} /></label>
          <label><span className="crm-label">Currency</span><select className="crm-input" value={planForm.currency} onChange={(event) => setPlanForm((current) => ({ ...current, currency: event.target.value as SubscriptionPlan["currency"] }))}><option>USD</option><option>BDT</option><option>INR</option></select></label>
          <label><span className="crm-label">Clients</span><input required min="0" step="1" type="number" className="crm-input" title="0 means unlimited" value={planForm.clients} onChange={(event) => setPlanForm((current) => ({ ...current, clients: event.target.value }))} /></label>
          <div className="flex gap-1.5">{editingPlanId && <button type="button" className="h-8 rounded border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => { setEditingPlanId(""); setPlanForm({ name: "", price: "", currency: planForm.currency, clients: "0" }); }}>Cancel</button>}<button disabled={saving} className="h-8 rounded bg-[#1d4ed8] px-2.5 text-xs font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50">{saving ? "Saving..." : editingPlanId ? "Save" : "Add plan"}</button></div>
        </form>
        <div className="overflow-x-auto"><table className="crm-compact-table min-w-[640px]"><thead className="crm-table-head"><tr><th>Plan</th><th>Price</th><th>Clients</th><th className="text-right">Actions</th></tr></thead><tbody>{plans.length ? plans.map((plan) => <tr key={plan._id} className={editingPlanId === plan._id ? "bg-blue-50" : ""}><td className="crm-table-cell font-semibold text-slate-800">{plan.name}</td><td className="crm-table-cell">{formatMoney(plan.price, plan.currency)} / mo</td><td className="crm-table-cell">{(plan.limits?.clients || 0) > 0 ? plan.limits?.clients : "Unlimited"}</td><td className="crm-table-cell"><div className="flex justify-end gap-1">{confirmDeleteId === plan._id ? <><button type="button" disabled={saving} className="rounded bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50" onClick={() => void refreshAfter(async () => { await deleteSubscriptionPlan(plan._id); if (editingPlanId === plan._id) setEditingPlanId(""); setConfirmDeleteId(""); })}>Delete</button><button type="button" className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700" onClick={() => setConfirmDeleteId("")}>Cancel</button></> : <><button type="button" className="crm-icon-button" aria-label={`Edit ${plan.name}`} onClick={() => { setEditingPlanId(plan._id); setConfirmDeleteId(""); setPlanForm({ name: plan.name, price: String(plan.price), currency: plan.currency, clients: String(plan.limits?.clients || 0) }); }}><Pencil className="size-3.5" /></button><button type="button" className="crm-icon-button text-rose-700" aria-label={`Delete ${plan.name}`} onClick={() => setConfirmDeleteId(plan._id)}><Trash2 className="size-3.5" /></button></>}</div></td></tr>) : <tr><td className="crm-table-cell text-slate-500" colSpan={4}>No plans yet.</td></tr>}</tbody></table></div>
      </section>
    </div>;
  }

  return (
    <div className="crm-light-portal crm-design-shell space-y-4 text-slate-900">
      <div className="crm-page-header">
        <div className="crm-page-header-main">
          <div className="crm-page-header-tab"><h2 className="crm-page-title">Subscriptions</h2></div>
          <div className="crm-page-header-meta"><p className="crm-page-subtitle">{isPlatform ? "Create the plans you assign when adding an agency" : "Monthly SaaS plan control for agencies"}</p></div>
        </div>
        {!isPlatform && <Button disabled={saving}><Repeat className="size-4" />Manage billing</Button>}
      </div>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {!isPlatform && <div className="grid gap-3 md:grid-cols-3">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-2 text-lg font-bold text-slate-800">{item.value}</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded border border-gray-300 bg-[#eef2f6] text-[#1e40af]"><Icon className="size-4" /></div>
              </div>
            </Card>
          );
        })}
      </div>}

      <section className="rounded border border-gray-300 bg-white">
        <div className="border-b border-slate-200 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Current subscription</h3></div>
        <div className="p-5">
          {current ? (
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{current.plan.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{current.plan.currency} {current.plan.price} / month</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(current.plan.features || []).map((feature) => <span key={feature} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">{feature}</span>)}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <StatusBadge tone={current.status === "active" ? "success" : current.status === "past_due" ? "warning" : "default"}>{current.status}</StatusBadge>
                {canManagePlan && <button type="button" className="h-8 rounded border border-gray-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" onClick={() => void toggleSubscription(current)} disabled={saving}>{current.status === "active" ? "Cancel" : "Resume"}</button>}
              </div>
            </div>
          ) : <div className="crm-empty">No active subscription found.</div>}
        </div>
      </section>

      <section className="rounded border border-gray-300 bg-white">
        <div className="border-b border-slate-200 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Available plans</h3></div>
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {!plans.length && <p className="text-sm text-slate-500 md:col-span-3">No plans are available yet.</p>}
          {plans.map((plan) => (
            <Card key={plan._id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">{plan.name}</h3>
                  <p className="text-sm text-slate-500">{plan.currency} {plan.price} / month</p>
                  <p className="mt-1 text-xs text-slate-500">{(plan.limits?.clients || 0) > 0 ? `${plan.limits?.clients} clients` : "Unlimited clients"}</p>
                </div>
                <StatusBadge tone={plan.isActive ? "success" : "default"}>{plan.isActive ? "active" : "inactive"}</StatusBadge>
              </div>
              <div className="mt-3 space-y-2">{(plan.features || []).map((feature) => <div key={feature} className="text-xs text-slate-600">• {feature}</div>)}</div>
              {canManagePlan && <Button className="mt-4 w-full" disabled={saving} onClick={() => void startPlan(plan._id)}>Select plan</Button>}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
