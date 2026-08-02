import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import type { Client, Role, UserAccount } from "../../../types/crm";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";
import { Button } from "../../shared/Button";

const roleOptions: Role[] = ["team", "client", "moderator"];
const firstPermittedRole = (role: Role): Role => role === "admin" ? "team" : role === "team" ? "client" : "moderator";

export function UsersPage({ users, clients, currentRole, currentClient, onCreateUser, onRemoveUser }: {
  users: UserAccount[];
  clients: Client[];
  currentRole: Role;
  currentClient?: string | null;
  onCreateUser: (payload: { name: string; email: string; password: string; role: Role; client?: string }) => Promise<void>;
  onRemoveUser: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(() => firstPermittedRole(currentRole));
  const [client, setClient] = useState(currentClient || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const allowed = useMemo(() => currentRole === "admin" ? roleOptions : currentRole === "team" ? ["client", "moderator"] as Role[] : ["moderator"] as Role[], [currentRole]);

  const resetForm = () => {
    const nextRole = firstPermittedRole(currentRole);
    setName(""); setEmail(""); setPassword(""); setRole(nextRole); setClient(currentClient || ""); setError("");
  };
  const close = () => { setOpen(false); resetForm(); };
  const startCreate = () => { resetForm(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, currentRole, currentClient]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await onCreateUser({ name, email, password, role, client: role === "team" ? undefined : client });
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user");
    } finally { setSaving(false); }
  };

  const remove = async (user: UserAccount) => {
    if (!window.confirm(`Remove ${user.name}?`)) return;
    setError("");
    try { await onRemoveUser(user._id); } catch (err) { setError(err instanceof Error ? err.message : "Could not remove user"); }
  };

  const action = (user: UserAccount) => user.role !== "admin" && currentRole !== "moderator" ? (
    <button className="crm-icon-button hover:border-red-500/40 hover:text-red-300" onClick={() => void remove(user)} aria-label={`Remove ${user.name}`} title="Remove user"><Trash2 className="size-3.5" /></button>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="crm-page-title">{currentRole === "client" ? "Moderators" : "Users & access"}</h2><p className="crm-page-subtitle">Role-based workspace access</p></div>{currentRole !== "moderator" && <Button onClick={startCreate}><Plus className="size-4" />Add User</Button>}</div>
      {error && !open && <div role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      <Card>
        {users.length ? <>
          <div className="crm-mobile-list">{users.map((user) => <article key={user._id} className="crm-mobile-card"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-100">{user.name}</p><p className="truncate text-xs text-slate-400">{user.email}</p></div>{action(user)}</div><div className="mt-4 flex flex-wrap items-center gap-2"><StatusBadge tone={user.role === "admin" ? "success" : user.role === "moderator" ? "warning" : "default"}>{user.role}</StatusBadge><StatusBadge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Disabled"}</StatusBadge><span className="text-xs text-slate-400">{typeof user.client === "object" && user.client ? user.client.name : "Agency"}</span></div></article>)}</div>
          <div className="crm-desktop-table"><table className="w-full min-w-[760px]"><thead className="crm-table-head"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody>{users.map((user) => <tr key={user._id} className="hover:bg-white/[0.02]"><td className="crm-table-cell"><p className="font-semibold text-slate-200">{user.name}</p><p className="text-xs text-slate-400">{user.email}</p></td><td className="crm-table-cell"><StatusBadge>{user.role}</StatusBadge></td><td className="crm-table-cell">{typeof user.client === "object" && user.client ? user.client.name : "Agency"}</td><td className="crm-table-cell"><StatusBadge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Disabled"}</StatusBadge></td><td className="crm-table-cell"><div className="flex justify-end">{action(user)}</div></td></tr>)}</tbody></table></div>
        </> : <div className="crm-empty"><UserRound className="size-5" />No users are available.</div>}
      </Card>
      {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><Card className="w-full max-w-lg" role="dialog" aria-modal="true" aria-labelledby="add-user-title"><div className="border-b border-[#20293a] px-5 py-4"><h3 id="add-user-title" className="font-semibold">Add workspace user</h3></div><form onSubmit={submit} className="space-y-4 p-5">{error && <div role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}<label><span className="crm-label">Full name</span><input required className="crm-input" value={name} onChange={(event) => setName(event.target.value)} /></label><label><span className="crm-label">Email</span><input required type="email" className="crm-input" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label><span className="crm-label">Temporary password</span><input required minLength={12} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}" title="Use 12 or more characters with uppercase, lowercase, number, and special character" type="password" autoComplete="new-password" className="crm-input" value={password} onChange={(event) => setPassword(event.target.value)} /><span className="mt-1.5 block text-xs text-slate-500">Use 12+ characters with uppercase, lowercase, number, and special character.</span></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="crm-label">Role</span><select className="crm-input" value={role} onChange={(event) => setRole(event.target.value as Role)}>{allowed.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{role !== "team" && <label><span className="crm-label">Client</span><select required disabled={currentRole === "client"} className="crm-input" value={client} onChange={(event) => setClient(event.target.value)}><option value="">Select client</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>}</div><div className="flex justify-end gap-2 border-t border-[#20293a] pt-4"><button type="button" className="rounded-md border border-[#263044] px-4 py-2 text-sm" onClick={close}>Cancel</button><Button disabled={saving}>{saving ? "Creating..." : "Create User"}</Button></div></form></Card></div>}
    </div>
  );
}
