import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Filter, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import type { Client, Role, UserAccount } from "../../../types/crm";
import { Card } from "../../shared/Card";
import { FeaturePanel } from "../../shared/FeaturePanel";
import { StatusBadge } from "../../shared/StatusBadge";
import { Button } from "../../shared/Button";

const roleOptions: Role[] = ["team", "client", "moderator"];
const firstPermittedRole = (role: Role): Role => role === "admin" ? "team" : role === "team" ? "client" : "moderator";

export function UsersPage({ users, clients, currentRole, currentClient, currentUserId, loadError, onRetry, onCreateUser, onUpdateUser, onRemoveUser }: {
  users: UserAccount[];
  clients: Client[];
  currentRole: Role;
  currentClient?: string | null;
  currentUserId: string;
  loadError?: string;
  onRetry?: () => void;
  onCreateUser: (payload: { name: string; email: string; password: string; role: Role; client?: string }) => Promise<void>;
  onUpdateUser: (id: string, payload: { name?: string; email?: string; role?: Role; client?: string | null; isActive?: boolean }) => Promise<void>;
  onRemoveUser: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(() => firstPermittedRole(currentRole));
  const [client, setClient] = useState(currentClient || "");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const allowed = useMemo(() => currentRole === "admin" ? roleOptions : currentRole === "team" ? ["client", "moderator"] as Role[] : ["moderator"] as Role[], [currentRole]);
  const filtered = useMemo(() => users.filter((user) => {
    const userClient = typeof user.client === "object" && user.client ? user.client : null;
    return (!search.trim() || [user.name, user.email, userClient?.name].some((value) => value?.toLowerCase().includes(search.toLowerCase())))
      && (roleFilter === "all" || user.role === roleFilter)
      && (statusFilter === "all" || (statusFilter === "active" ? user.isActive : !user.isActive))
      && (clientFilter === "all" || (clientFilter === "agency" ? !userClient : userClient?._id === clientFilter));
  }), [users, search, roleFilter, statusFilter, clientFilter]);
  const featureItems = useMemo(() => ([
    { key: "create", label: "Create user", description: "Add new workspace or client users from the panel", enabled: currentRole !== "moderator" },
    { key: "edit", label: "Edit user", description: "Modify name, role, client, and active state", enabled: currentRole === "admin" || currentRole === "team" || currentRole === "client" },
    { key: "remove", label: "Remove user", description: "Delete users according to role permissions", enabled: currentRole === "admin" || currentRole === "team" },
    { key: "client-scope", label: "Client scope", description: "Restrict moderator access to one client only", enabled: currentRole === "client" },
    { key: "admin-scope", label: "Admin scope", description: "Manage all workspace users including team and client roles", enabled: currentRole === "admin" },
    { key: "audit", label: "Audit trail", description: "Track user actions through workspace logs", enabled: true },
  ]), [currentRole]);

  const resetForm = () => {
    const nextRole = firstPermittedRole(currentRole);
    setEditing(null); setName(""); setEmail(""); setPassword(""); setRole(nextRole); setClient(currentClient || ""); setIsActive(true); setError("");
  };
  const close = () => { setOpen(false); resetForm(); };
  const startCreate = () => { resetForm(); setOpen(true); };
  const startEdit = (user: UserAccount) => { setEditing(user); setName(user.name); setEmail(user.email); setRole(user.role); setClient(typeof user.client === "object" && user.client ? user.client._id : typeof user.client === "string" ? user.client : ""); setIsActive(user.isActive); setPassword(""); setError(""); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, currentRole, currentClient]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (editing) {
        const originalClient = typeof editing.client === "object" && editing.client ? editing.client._id : typeof editing.client === "string" ? editing.client : null;
        const nextClient = ["client", "moderator"].includes(role) ? client : null;
        const payload: { name?: string; email?: string; role?: Role; client?: string | null; isActive?: boolean } = {};
        if (name.trim() !== editing.name) payload.name = name.trim();
        if (email.trim().toLowerCase() !== editing.email.toLowerCase()) payload.email = email.trim();
        if (role !== editing.role) payload.role = role;
        if (nextClient !== originalClient) payload.client = nextClient;
        if (isActive !== editing.isActive) payload.isActive = isActive;
        if (!Object.keys(payload).length) { close(); return; }
        await onUpdateUser(editing._id, payload);
      } else {
        await onCreateUser({ name, email, password, role, client: role === "team" ? undefined : client });
      }
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : editing ? "Could not update user" : "Could not create user");
    } finally { setSaving(false); }
  };

  const remove = async (user: UserAccount) => {
    if (!window.confirm(`Remove ${user.name}?`)) return;
    setError("");
    try { await onRemoveUser(user._id); } catch (err) { setError(err instanceof Error ? err.message : "Could not remove user"); }
  };

  const action = (user: UserAccount) => {
    const userClientId = typeof user.client === "object" && user.client ? user.client._id : user.client;
    const canManageTarget = currentRole === "admin"
      ? user.role !== "admin" || user._id === currentUserId
      : currentRole === "team"
        ? ["client", "moderator"].includes(user.role)
        : currentRole === "client"
          ? user.role === "moderator" && userClientId === currentClient
          : false;
    const canEdit = canManageTarget;
    const canRemove = canManageTarget && user.role !== "admin" && user._id !== currentUserId;
    return canEdit || canRemove ? <div className="flex gap-1">{canEdit && <button type="button" className="crm-icon-button" onClick={() => startEdit(user)} aria-label={`Edit ${user.name}`} title="Edit user"><Pencil className="size-3.5" /></button>}{canRemove && <button type="button" className="crm-icon-button hover:border-red-500/40 hover:text-red-300" onClick={() => void remove(user)} aria-label={`Remove ${user.name}`} title="Remove user"><Trash2 className="size-3.5" /></button>}</div> : null;
  };

  return (
    <div className="crm-light-portal crm-design-shell space-y-3">
      <div className="crm-page-header"><div className="crm-page-header-main"><div className="crm-page-header-tab"><h2 className="crm-page-title">{currentRole === "client" ? "Moderators" : "Users & access"}</h2></div><div className="crm-page-header-meta"><p className="crm-page-subtitle">Role-based workspace access</p></div></div>{currentRole !== "moderator" && <Button onClick={startCreate}><Plus className="size-4" />Add User</Button>}</div>
      <FeaturePanel title="User access matrix" subtitle="Control which user operations are available from the panel for the active role" items={featureItems} />
      {error && !open && <div role="alert" className="rounded-md bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}{loadError && <div role="alert" className="rounded-md border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-200">Could not load users: {loadError}. <button type="button" className="font-semibold underline" onClick={() => onRetry ? onRetry() : window.location.reload()}>Retry</button></div>}
      <Card>
        <div className="crm-toolbar sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,12rem))_auto]">
          <div className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><input aria-label="Search users" className="crm-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." /></div>
          <select aria-label="Filter users by role" className="crm-input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">All roles</option>{(["admin", "team", "client", "moderator"] as Role[]).map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select aria-label="Filter users by status" className="crm-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select>
          <select aria-label="Filter users by client" className="crm-input" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="all">All clients</option><option value="agency">Agency</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
          <span className="inline-flex min-h-10 items-center gap-1.5 text-xs text-slate-500"><Filter className="size-4" />{filtered.length} records</span>
        </div>
        {filtered.length ? <>
          <div className="crm-mobile-list">{filtered.map((user) => <article key={user._id} className="crm-mobile-card"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-100">{user.name}</p><p className="truncate text-xs text-slate-400">{user.email}</p></div>{action(user)}</div><div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge tone={user.role === "admin" ? "success" : user.role === "moderator" ? "warning" : "default"}>{user.role}</StatusBadge><StatusBadge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Disabled"}</StatusBadge><span className="text-xs text-slate-400">{typeof user.client === "object" && user.client ? user.client.name : "Agency"}</span></div></article>)}</div>
          <div className="crm-desktop-table"><table className="crm-compact-table min-w-[760px]"><thead className="crm-table-head"><tr><th className="px-2 py-2">User</th><th className="px-2 py-2">Role</th><th className="px-2 py-2">Client</th><th className="px-2 py-2">Status</th><th className="px-2 py-2 text-right">Action</th></tr></thead><tbody>{filtered.map((user) => <tr key={user._id} className="hover:bg-white/[0.02]"><td className="crm-table-cell"><p className="font-semibold text-slate-200">{user.name}</p><p className="text-xs text-slate-400">{user.email}</p></td><td className="crm-table-cell"><StatusBadge>{user.role}</StatusBadge></td><td className="crm-table-cell">{typeof user.client === "object" && user.client ? user.client.name : "Agency"}</td><td className="crm-table-cell"><StatusBadge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Disabled"}</StatusBadge></td><td className="crm-table-cell"><div className="flex justify-end">{action(user)}</div></td></tr>)}</tbody></table></div>
        </> : <div className="crm-empty"><UserRound className="size-5" />No users match the current filters.</div>}
      </Card>
      {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><Card className="w-full max-w-lg" role="dialog" aria-modal="true" aria-labelledby="user-form-title"><div className="border-b border-[#20293a] px-4 py-3"><h3 id="user-form-title" className="font-semibold">{editing ? "Edit workspace user" : "Add workspace user"}</h3></div><form onSubmit={submit} className="space-y-3 p-4">{error && <div role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}<label><span className="crm-label">Full name</span><input required minLength={2} maxLength={100} className="crm-input" value={name} onChange={(event) => setName(event.target.value)} /></label><label><span className="crm-label">Email</span><input required type="email" className="crm-input" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{!editing && <label><span className="crm-label">Temporary password</span><input required minLength={12} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}" title="Use 12 or more characters with uppercase, lowercase, number, and special character" type="password" autoComplete="new-password" className="crm-input" value={password} onChange={(event) => setPassword(event.target.value)} /><span className="mt-1.5 block text-xs text-slate-500">Use 12+ characters with uppercase, lowercase, number, and special character.</span></label>}<div className="grid gap-4 sm:grid-cols-2"><label><span className="crm-label">Role</span><select disabled={editing?._id === currentUserId} className="crm-input" value={role} onChange={(event) => setRole(event.target.value as Role)}>{editing?.role === "admin" && <option value="admin">admin</option>}{allowed.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{["client", "moderator"].includes(role) && <label><span className="crm-label">Client</span><select required disabled={currentRole === "client"} className="crm-input" value={client} onChange={(event) => setClient(event.target.value)}><option value="">Select client</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>}{editing && <label className="flex items-center gap-2 pt-6"><input type="checkbox" disabled={editing._id === currentUserId} checked={isActive} onChange={(event) => setIsActive(event.target.checked)}/><span className="text-sm">Active account</span></label>}</div><div className="flex justify-end gap-2 border-t border-[#20293a] pt-4"><button type="button" className="rounded-md border border-[#263044] px-4 py-2 text-sm" onClick={close}>Cancel</button><Button disabled={saving}>{saving ? "Saving..." : editing ? "Save User" : "Create User"}</Button></div></form></Card></div>}
    </div>
  );
}
