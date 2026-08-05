import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { BellRing, Check, MessageSquare, Megaphone, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { AdRequest, Client, ClientUpdate, Role, Screen, UserAccount } from "../types/crm";
import { formatDate } from "../lib/formatters";
import { createClient, deleteClient, updateClient } from "../features/clients/clientsApi";
import { createAdRequest, deleteAdRequest, updateAdRequest, updateRequestStatus } from "../features/requests/requestsApi";
import { assignCampaignClient, assignClientAdAccount, createCampaign, deleteCampaign, updateCampaign } from "../features/campaigns/campaignsApi";
import { createInvoice, deleteInvoice, markInvoicePaid, updateInvoice } from "../features/billing/billingApi";
import { createUser, removeUser, updateUser } from "../features/users/usersApi";
import { createUpdate, deleteUpdate, markUpdateRead, updateClientUpdate } from "../features/updates/updatesApi";
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
            <div className="flex size-8 items-center justify-center rounded-md bg-blue-600"><MessageSquare className="size-4" /></div>
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

function Updates({ updates, role, currentUser, clients, requests, onCreate, onEdit, onDelete, onMarkRead }: { updates: ClientUpdate[]; role: Role; currentUser: UserAccount; clients: Client[]; requests: AdRequest[]; onCreate: (payload: { client: string; adRequest: string; title: string; content: string; type?: ClientUpdate["type"] }) => Promise<void>; onEdit: (id: string, payload: { client?: string; adRequest?: string; title?: string; content?: string; type?: ClientUpdate["type"] }) => Promise<void>; onDelete: (id: string) => Promise<void>; onMarkRead: (id: string) => Promise<void> }) {
  const [search, setSearch] = useState(""); const [typeFilter, setTypeFilter] = useState("all"); const [clientFilter, setClientFilter] = useState("all"); const [readFilter, setReadFilter] = useState("all"); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<ClientUpdate | null>(null); const [client, setClient] = useState(""); const [adRequest, setAdRequest] = useState(""); const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [type, setType] = useState<ClientUpdate["type"]>("message"); const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  const canManage = role === "admin" || role === "team"; const canRead = role === "client" || role === "moderator";
  const isRead = (item: ClientUpdate) => Boolean(item.readBy?.some((entry) => (typeof entry.user === "string" ? entry.user : entry.user._id) === currentUser._id));
  const matchingRequests = useMemo(() => requests.filter((item) => item.client?._id === client), [requests, client]);
  const filtered = useMemo(() => updates.filter((item) => (!search.trim() || [item.title, item.content, item.client?.name, item.adRequest?.requestNumber].some((value) => value?.toLowerCase().includes(search.toLowerCase()))) && (typeFilter === "all" || item.type === typeFilter) && (clientFilter === "all" || item.client?._id === clientFilter) && (readFilter === "all" || (readFilter === "read") === isRead(item))), [updates, search, typeFilter, clientFilter, readFilter, currentUser._id]);
  const close = () => { setOpen(false); setEditing(null); setError(""); }; const startCreate = () => { setEditing(null); setClient(""); setAdRequest(""); setTitle(""); setContent(""); setType("message"); setError(""); setOpen(true); }; const startEdit = (item: ClientUpdate) => { setEditing(item); setClient(item.client?._id || ""); setAdRequest(item.adRequest?._id || ""); setTitle(item.title); setContent(item.content); setType(item.type); setError(""); setOpen(true); };
  useEffect(() => { if (!open) return; const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); }; window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape); }, [open]);
  const run = async (key: string, action: () => Promise<void>) => { setBusy(key); setError(""); try { await action(); } catch (err) { setError(err instanceof Error ? err.message : "Could not update client message"); throw err; } finally { setBusy(""); } };
  const submit = async (event: FormEvent) => { event.preventDefault(); try { const payload = { client, adRequest, title, content, type }; if (editing) await run("form", () => onEdit(editing._id, payload)); else await run("form", () => onCreate(payload)); close(); } catch { /* surfaced */ } };
  const remove = async (item: ClientUpdate) => { if (!window.confirm(`Delete update “${item.title}”?`)) return; try { await run(`delete-${item._id}`, () => onDelete(item._id)); } catch { /* surfaced */ } };
  return <div className="space-y-4"><div className="flex items-center justify-between gap-3"><div><h2 className="crm-page-title">Client updates</h2><p className="crm-page-subtitle">Status, performance, and billing messages</p></div>{canManage && <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold" onClick={startCreate}><Plus className="size-4"/>New update</button>}</div>{error && !open && <div role="alert" className="rounded-md bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}<Card><div className="grid gap-2 border-b border-[#20293a] p-3 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,12rem))]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600"/><input className="crm-input pl-9" aria-label="Search updates" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search updates..."/></div><select className="crm-input" aria-label="Filter update type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option>{["message", "performance", "billing", "status"].map((item) => <option key={item}>{item}</option>)}</select><select className="crm-input" aria-label="Filter update client" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="all">All clients</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select><select className="crm-input" aria-label="Filter update read status" value={readFilter} onChange={(event) => setReadFilter(event.target.value)}><option value="all">All read states</option><option value="unread">Unread</option><option value="read">Read</option></select></div>{filtered.length ? <div className="divide-y divide-[#20293a]">{filtered.map((item) => <article key={item._id} className="flex gap-3 p-4 sm:p-5"><div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-400"><MessageSquare className="size-4"/></div><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row"><h3 className="font-semibold text-slate-200">{item.title}</h3><time className="text-xs text-slate-500">{formatDate(item.createdAt)}</time></div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.content}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded border border-[#263044] px-2 py-0.5 text-[10px] uppercase text-slate-400">{item.type}</span><span className="text-xs text-slate-500">{item.client?.name} · {item.adRequest?.requestNumber}</span>{canRead && <span className="text-xs text-slate-500">{isRead(item) ? "Read" : "Unread"}</span>}</div></div><div className="flex shrink-0 gap-1">{canManage && <><button className="crm-icon-button" onClick={() => startEdit(item)} aria-label={`Edit ${item.title}`}><Pencil className="size-3.5"/></button><button className="crm-icon-button hover:text-red-300" disabled={busy === `delete-${item._id}`} onClick={() => void remove(item)} aria-label={`Delete ${item.title}`}><Trash2 className="size-3.5"/></button></>}{canRead && !isRead(item) && <button className="crm-icon-button" disabled={busy === `read-${item._id}`} onClick={() => void run(`read-${item._id}`, () => onMarkRead(item._id)).catch(() => undefined)} aria-label={`Mark ${item.title} read`}><Check className="size-3.5"/></button>}</div></article>)}</div> : <div className="crm-empty"><BellRing className="size-5"/>No updates match the current filters.</div>}</Card>
    {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="update-title"><div className="flex items-center justify-between border-b border-[#20293a] p-4"><h3 id="update-title" className="font-semibold">{editing ? "Edit client update" : "Create client update"}</h3><button className="crm-icon-button" onClick={close} aria-label="Close"><X className="size-4"/></button></div><form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={submit}>{error && <div role="alert" className="sm:col-span-2 rounded-md bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}<label><span className="crm-label">Client</span><select required className="crm-input" value={client} onChange={(event) => { setClient(event.target.value); setAdRequest(""); }}><option value="">Select client</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label><span className="crm-label">Ad request</span><select required className="crm-input" value={adRequest} onChange={(event) => setAdRequest(event.target.value)}><option value="">Select request</option>{matchingRequests.map((item) => <option key={item._id} value={item._id}>{item.requestNumber} · {item.pageName}</option>)}</select></label><label><span className="crm-label">Type</span><select className="crm-input" value={type} onChange={(event) => setType(event.target.value as ClientUpdate["type"])}>{["message", "performance", "billing", "status"].map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="crm-label">Title</span><input required maxLength={150} className="crm-input" value={title} onChange={(event) => setTitle(event.target.value)}/></label><label className="sm:col-span-2"><span className="crm-label">Content</span><textarea required maxLength={3000} rows={6} className="crm-input" value={content} onChange={(event) => setContent(event.target.value)}/></label><div className="flex justify-end gap-2 border-t border-[#20293a] pt-4 sm:col-span-2"><button type="button" className="rounded-md border border-[#263044] px-4 py-2 text-sm" onClick={close}>Cancel</button><button disabled={busy === "form"} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy === "form" ? "Saving..." : "Save update"}</button></div></form></Card></div>}
  </div>;
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
        {screen === "requests" && <RequestsPage agencyId={agency} clients={data.clients} requests={data.requests} role={session.user.role} currentClient={session.user.client} onCreateRequest={(payload) => mutate(() => createAdRequest(agency, payload))} onUpdateRequest={(id, payload) => mutate(() => updateAdRequest(agency, id, payload))} onDeleteRequest={(id) => mutate(() => deleteAdRequest(agency, id))} onUpdateStatus={(id, payload) => mutate(() => updateRequestStatus(agency, id, payload))} />}
        {screen === "campaigns" && <CampaignsPage campaigns={data.campaigns} accounts={data.facebookAccounts.length ? data.facebookAccounts : data.facebook?.connection.accounts || []} clients={data.clients} requests={data.requests} role={session.user.role} onCreateCampaign={(payload) => mutate(() => createCampaign(agency, payload))} onUpdateCampaign={(id, payload) => mutate(() => updateCampaign(agency, id, payload))} onDeleteCampaign={(id) => mutate(() => deleteCampaign(agency, id))} onAssignCampaignClient={(campaignId, clientId) => mutate(() => assignCampaignClient(agency, campaignId, clientId))} onAssignClientAdAccount={(clientId, accountId, assigned) => mutate(() => assignClientAdAccount(agency, clientId, accountId, assigned))} />}
        {screen === "billing" && <BillingPage invoices={data.invoices} clients={data.clients} requests={data.requests} role={session.user.role} onCreateInvoice={(payload) => mutate(() => createInvoice(agency, payload))} onUpdateInvoice={(id, payload) => mutate(() => updateInvoice(agency, id, payload))} onDeleteInvoice={(id) => mutate(() => deleteInvoice(agency, id))} onMarkPaid={(id) => mutate(() => markInvoicePaid(agency, id))} />}
        {screen === "settings" && <SettingsPage agencyId={agency} onWorkspaceRefresh={refresh} />}
        {screen === "updates" && <Updates updates={data.updates} role={session.user.role} currentUser={session.user} clients={data.clients} requests={data.requests} onCreate={(payload) => mutate(() => createUpdate(agency, payload))} onEdit={(id, payload) => mutate(() => updateClientUpdate(agency, id, payload))} onDelete={(id) => mutate(() => deleteUpdate(agency, id))} onMarkRead={(id) => mutate(() => markUpdateRead(agency, id))} />}
        {screen === "users" && <UsersPage users={data.users} clients={data.clients} currentRole={session.user.role} currentClient={session.user.client} currentUserId={session.user._id} onCreateUser={(payload) => mutate(() => createUser(agency, payload))} onUpdateUser={(id, payload) => mutate(() => updateUser(agency, id, payload))} onRemoveUser={(id) => mutate(() => removeUser(agency, id))} />}
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  const sessionController = useSessionController();
  if (!sessionController.session) return <AuthPage onEnter={sessionController.enter} message={sessionController.sessionMessage} />;
  return <AuthenticatedWorkspace session={sessionController.session} onLogout={sessionController.logout} />;
}
