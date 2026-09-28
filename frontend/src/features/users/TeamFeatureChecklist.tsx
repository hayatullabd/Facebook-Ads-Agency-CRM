export const TEAM_FEATURE_OPTIONS = [
  { id: "clients", label: "Clients" },
  { id: "requests", label: "Ad Requests" },
  { id: "campaigns", label: "Live Campaigns" },
  { id: "adaccounts", label: "Ad Accounts" },
  { id: "billing", label: "Payment Dues" },
  { id: "payment_details", label: "Payment Details" },
  { id: "subscriptions", label: "Subscriptions" },
] as const;

export type TeamFeatureId = (typeof TEAM_FEATURE_OPTIONS)[number]["id"];

export const teamFeatureLabel = (id: string) => TEAM_FEATURE_OPTIONS.find((item) => item.id === id)?.label || id;

export function TeamFeatureChecklist({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  return <fieldset>
    <legend className="crm-label">Feature access</legend>
    <p className="mb-2 text-[11px] text-slate-500">Dashboard stays open. This member can open only the features you tick.</p>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {TEAM_FEATURE_OPTIONS.map((item) => <label key={item.id} className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700">
        <input type="checkbox" checked={value.includes(item.id)} onChange={() => toggle(item.id)} />
        {item.label}
      </label>)}
    </div>
  </fieldset>;
}
