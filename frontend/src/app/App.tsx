import { lazy, Suspense, useEffect, useState } from "react";
import { BellRing, MessageSquare, Megaphone, X } from "lucide-react";
import type { ClientUpdate, RequestStatus, Role, Screen } from "../types/crm";
import { formatDate } from "../lib/formatters";
import { createClient, deleteClient, updateClient } from "../features/clients/clientsApi";
import { createAdRequest, updateRequestStatus } from "../features/requests/requestsApi";
import { updateCampaign } from "../features/campaigns/campaignsApi";
import { markInvoicePaid } from "../features/billing/billingApi";
import { createUser, removeUser } from "../features/users/usersApi";
import { AppShell } from "../features/shared/AppShell";
import { SidebarNav } from "../features/shared/SidebarNav";
import { Topbar } from "../features/shared/Topbar";
import { Card } from "../features/shared/Card";
import { AuthPage } from "../features/auth/pages/AuthPage";
import { useNavigationController, type NavigationItem } from "./useNavigationController";
import { useSessionController } from "./useSessionController";
import { useWorkspaceController } from "./useWorkspaceController";

const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const ClientsPage = lazy(() => import("../features/clients/pages/ClientsPage").then((module) => ({ default: module.ClientsPage })));
const RequestsPage = lazy(() => import("../features/requests/pages/RequestsPage").then((module) => ({ default: module.RequestsPage })));
const CampaignsPage = lazy(() => import("../features/campaigns/pages/CampaignsPage").then((module) => ({ default: module.CampaignsPage })));
const BillingPage = lazy(() => import("../features/billing/pages/BillingPage").then((module) => ({ default: module.BillingPage })));
const SettingsPage = lazy(() => import("../features/settings/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const UsersPage = lazy(() => import("../features/users/pages/UsersPage").then((module) => ({ default: module.UsersPage })));

function PageFallback() {
  return <div role="status" className="text-sm text-slate-400">Loading page...</div>;
}

function Sidebar({ screen, items, role, open, onNavigate, onClose }: {
  screen: Screen;
  items: NavigationItem[];
  role: Role;
  open: boolean;
  onNavigate: (screen: Screen) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  return (
    <>
      <SidebarNav open={open}>
        <div className="flex items-center justify-between border-b border-[#20293a] px-2 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-blue-600"><Megaphone className="size-4" /></div>
            <div><p className="font-bold">AdFlow Pro</p><p className="text-[10px] uppercase text-slate-500">Agency CRM</p></div>
          </div>
          <button onClick={onClose} className="crm-icon-button border-0 lg:hidden" aria-label="Close navigation"><X className="size-5" /></button>
        </div>
        <nav className="mt-4 flex-1 space-y-1" aria-label="Primary navigation">
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onNavigate(id); onClose(); }}
              className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium transition ${screen === id ? "border-blue-500/20 bg-blue-500/10 text-blue-300" : "border-transparent text-slate-400 hover:bg-[#131827] hover:text-slate-100"}`}
            >
              <Icon className="size-4" />{label}
            </button>
          ))}
        </nav>
        <div className="rounded-md border border-[#20293a] bg-[#131827] p-3">
          <p className="text-[10px] uppercase text-slate-500">Session role</p>
          <p className="mt-1 text-sm font-semibold capitalize text-slate-200">{role}</p>
        </div>
      </SidebarNav>
      {open && <button className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={onClose} aria-label="Close navigation overlay" />}
    </>
  );
}

function Updates({ updates }: { updates: ClientUpdate[] }) {
  return (
    <div className="space-y-4">
      <div><h2 className="crm-page-title">Client updates</h2><p className="crm-page-subtitle">Status, performance, and billing messages</p></div>
      <Card>
        {updates.length ? (
          <div className="divide-y divide-[#20293a]">
            {updates.map((update) => (
              <div key={update._id} className="flex gap-3 p-4 sm:p-5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-400"><MessageSquare className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-1 sm:flex-row"><h3 className="font-semibold text-slate-200">{update.title}</h3><time className="text-xs text-slate-500">{formatDate(update.createdAt)}</time></div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{update.content}</p>
                  <span className="mt-2 inline-flex rounded border border-[#263044] px-2 py-0.5 text-[10px] uppercase text-slate-400">{update.type}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="crm-empty"><BellRing className="size-5" />No updates have been published.</div>}
      </Card>
    </div>
  );
}

function AuthenticatedWorkspace({ session, onLogout }: { session: NonNullable<ReturnType<typeof useSessionController>["session"]>; onLogout: () => void }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { items, screen, title, setScreen } = useNavigationController(session.user.role);
  const { data, errors, loading, refresh } = useWorkspaceController(session.user.agency, session.user.role);
  const errorEntries = Object.entries(errors);
  const agency = session.user.agency;
  const mutate = async (action: () => Promise<unknown>) => { await action(); await refresh(); };

  return (
    <AppShell
      sidebar={<Sidebar screen={screen} items={items} role={session.user.role} open={mobileNavOpen} onNavigate={setScreen} onClose={() => setMobileNavOpen(false)} />}
      topbar={<Topbar title={title} role={session.user.role} userName={session.user.name} onMenu={() => setMobileNavOpen(true)} onLogout={onLogout} />}
    >
      {errorEntries.length > 0 && (
        <div role="alert" className="mb-4 flex flex-col gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <span>Some workspace data could not load: {errorEntries.map(([key]) => key).join(", ")}.</span>
          <button onClick={() => void refresh()} className="self-start font-semibold text-amber-100 underline underline-offset-4">Retry failed data</button>
        </div>
      )}
      {loading && <div role="status" className="mb-4 text-sm text-slate-400">Refreshing workspace data...</div>}
      <Suspense fallback={<PageFallback />}>
        {screen === "dashboard" && <DashboardPage clients={data.clients} requests={data.requests} campaigns={data.campaigns} invoices={data.invoices} facebookOverview={data.facebook} />}
        {screen === "clients" && <ClientsPage clients={data.clients} onCreateClient={(payload) => mutate(() => createClient(agency, payload))} onUpdateClient={(id, payload) => mutate(() => updateClient(agency, id, payload))} onDeleteClient={(id) => mutate(() => deleteClient(agency, id))} />}
        {screen === "requests" && <RequestsPage clients={data.clients} requests={data.requests} role={session.user.role} currentClient={session.user.client} onCreateRequest={(payload) => mutate(() => createAdRequest(agency, payload))} onUpdateStatus={(id, status: RequestStatus) => mutate(() => updateRequestStatus(agency, id, { status }))} />}
        {screen === "campaigns" && <CampaignsPage campaigns={data.campaigns} accounts={data.facebookAccounts.length ? data.facebookAccounts : data.facebook?.connection.accounts || []} role={session.user.role} onUpdateCampaign={(id, payload) => mutate(() => updateCampaign(agency, id, payload))} />}
        {screen === "billing" && <BillingPage invoices={data.invoices} role={session.user.role} onMarkPaid={(id) => mutate(() => markInvoicePaid(agency, id))} />}
        {screen === "settings" && <SettingsPage agencyId={agency} onWorkspaceRefresh={refresh} />}
        {screen === "updates" && <Updates updates={data.updates} />}
        {screen === "users" && <UsersPage users={data.users} clients={data.clients} currentRole={session.user.role} currentClient={session.user.client} onCreateUser={(payload) => mutate(() => createUser(agency, payload))} onRemoveUser={(id) => mutate(() => removeUser(agency, id))} />}
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  const sessionController = useSessionController();
  if (!sessionController.session) return <AuthPage onEnter={sessionController.enter} message={sessionController.sessionMessage} />;
  return <AuthenticatedWorkspace session={sessionController.session} onLogout={sessionController.logout} />;
}
