import type { ReactNode } from "react";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";

export type FeaturePanelItem = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
};

export function FeaturePanel({
  title,
  subtitle,
  items,
  actions,
}: {
  title: string;
  subtitle: string;
  items: FeaturePanelItem[];
  actions?: ReactNode;
}) {
  return (
    <Card className="crm-feature-panel space-y-3 p-3 sm:p-4">
      <div className="crm-page-header">
        <div className="crm-page-header-main">
          <div className="crm-page-header-tab">
            <h3 className="crm-page-title">{title}</h3>
          </div>
          <div className="crm-page-header-meta">
            <p className="crm-page-subtitle">{subtitle}</p>
          </div>
        </div>
        {actions}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.key} className={`flex min-h-24 flex-col gap-2 rounded-md border p-3 ${item.enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              {item.enabled ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Lock className="size-4 text-slate-400" />}
            </div>
            <p className="text-xs leading-5 text-slate-500">{item.description}</p>
            <div className="mt-auto flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <ShieldCheck className={`size-3.5 ${item.enabled ? "text-emerald-600" : "text-slate-400"}`} />
              {item.enabled ? "Enabled" : "Read only"}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function FeatureToggleButton({ enabled, label, onClick }: { enabled: boolean; label: string; onClick: () => void }) {
  return <Button onClick={onClick}>{enabled ? `Disable ${label}` : `Enable ${label}`}</Button>;
}
