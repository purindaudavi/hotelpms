"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Filter, Search, SlidersHorizontal, UserCog, UserPlus, X } from "lucide-react";

const permissions = [
  "Front Desk",
  "Dashboard",
  "Reservations",
  "Rooms & Rates",
  "Channels",
  "POS",
  "Financials",
  "Settings",
  "Housekeeping",
  "Reports",
  "CRM",
  "Night Audit",
  "IBE"
] as const;

type Permission = (typeof permissions)[number];
type UserRecord = {
  id: string;
  name: string;
  email: string;
  permissions: Permission[];
  status: "Invited" | "Active";
};

export function UsersSettingsPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [permissionFilter, setPermissionFilter] = useState<"All" | Permission>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | UserRecord["status"]>("All");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const searchable = [user.name, user.email, user.status, ...user.permissions].join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesPermission = permissionFilter === "All" || user.permissions.includes(permissionFilter);
      const matchesStatus = statusFilter === "All" || user.status === statusFilter;
      return matchesSearch && matchesPermission && matchesStatus;
    });
  }, [permissionFilter, search, statusFilter, users]);

  function addUser(user: Omit<UserRecord, "id" | "status">) {
    setUsers((current) => [
      { ...user, id: `user-${Date.now()}`, status: "Invited" },
      ...current
    ]);
    setDrawerOpen(false);
  }

  const filtersActive = permissionFilter !== "All" || statusFilter !== "All";

  return (
    <main className="space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Users</h1>
          <p className="mt-1 text-base text-slate-500">Active users: {users.filter((user) => user.status === "Active").length} / 15</p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <UserPlus className="h-5 w-5" />
          Add User
        </button>
      </header>

      <div className="flex items-center gap-3">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search..."
            className="focus-ring h-12 w-full rounded-md border border-line bg-white pl-12 pr-4 text-base"
          />
        </label>
        <button
          type="button"
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen((open) => !open)}
          className={`inline-flex h-12 items-center gap-2 rounded-md border px-5 text-sm font-semibold transition ${filterOpen || filtersActive ? "border-ocean bg-sky-50 text-ocean" : "border-line bg-white hover:bg-slate-50"}`}
        >
          <Filter className="h-5 w-5" />
          Filter
        </button>
      </div>

      {filterOpen ? (
        <section className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-sm sm:grid-cols-2">
          <FilterSelect label="Permission" value={permissionFilter} onChange={(value) => setPermissionFilter(value as "All" | Permission)} options={["All", ...permissions]} />
          <FilterSelect label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as "All" | UserRecord["status"])} options={["All", "Active", "Invited"]} />
          {filtersActive ? (
            <button type="button" onClick={() => { setPermissionFilter("All"); setStatusFilter("All"); }} className="w-fit text-sm font-semibold text-ocean hover:underline sm:col-span-2">
              Clear filters
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-6 py-5">
          <h2 className="text-2xl font-semibold">Users</h2>
        </div>

        {visibleUsers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Name', 'Email', 'Permissions', 'Status'].map((heading) => <th key={heading} className="px-6 py-3 font-semibold">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id} className="border-t border-line hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-semibold text-ink">{user.name}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="max-w-xl px-6 py-4 text-slate-600">{user.permissions.length ? user.permissions.join(", ") : "No permissions"}</td>
                    <td className="px-6 py-4"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{user.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-[280px] place-items-center px-6 py-12 text-center">
            <div>
              {users.length ? <SlidersHorizontal className="mx-auto h-12 w-12 text-slate-500" /> : <UserCog className="mx-auto h-12 w-12 text-slate-500" />}
              <p className="mt-4 text-xl font-semibold">{users.length ? "No matching users" : "No users found"}</p>
              <p className="mt-2 text-base text-slate-500">{users.length ? "Try changing your search or filters" : "Add a user to get started"}</p>
            </div>
          </div>
        )}
      </section>

      {drawerOpen ? <InviteUserDrawer onClose={() => setDrawerOpen(false)} onInvite={addUser} /> : null}
    </main>
  );
}

function InviteUserDrawer({ onClose, onInvite }: { onClose: () => void; onInvite: (user: Omit<UserRecord, "id" | "status">) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Permission[]>([]);

  function togglePermission(permission: Permission) {
    setSelected((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onInvite({ name: name.trim(), email: email.trim(), permissions: selected });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="h-full w-full max-w-[790px] overflow-y-auto rounded-l-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="invite-user-title">
        <div className="flex items-center justify-between px-8 py-7">
          <h2 id="invite-user-title" className="text-2xl font-bold">Invite User</h2>
          <button type="button" onClick={onClose} aria-label="Close invite user" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-6 px-8 pb-8">
          <FormField label="Name">
            <input autoFocus required value={name} onChange={(event) => setName(event.target.value)} className="focus-ring h-14 w-full rounded-lg border border-line px-4 text-base" />
          </FormField>
          <FormField label="Email">
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="focus-ring h-14 w-full rounded-lg border border-line px-4 text-base" />
          </FormField>

          <fieldset>
            <legend className="mb-3 text-base font-semibold">User Permission</legend>
            <div className="grid gap-x-12 gap-y-4 sm:grid-cols-2">
              {permissions.map((permission) => (
                <label key={permission} className="flex cursor-pointer items-center gap-3 text-base text-ink">
                  <input type="checkbox" checked={selected.includes(permission)} onChange={() => togglePermission(permission)} className="h-5 w-5 rounded border-slate-300 accent-ink" />
                  {permission}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="h-12 w-full rounded-md bg-ink text-sm font-semibold text-white transition hover:bg-slate-800">Send Invitation</button>
        </form>
      </aside>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-base font-semibold">{label}</span>{children}</label>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
