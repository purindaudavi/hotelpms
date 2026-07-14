"use client";

import { type Dispatch, type FormEvent, type SetStateAction, useMemo, useState } from "react";
import { Filter, Package, Plus, Search, X } from "lucide-react";

export type SupplierRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  vatNo: string;
  commission: number;
  category: string;
  status: "Active" | "Inactive";
};

type SuppliersPageProps = {
  suppliers: SupplierRecord[];
  setSuppliers: Dispatch<SetStateAction<SupplierRecord[]>>;
  setToast: (message: string) => void;
};

const supplierCategories = ["Food & Beverage", "Laundry", "Utilities", "Maintenance", "Room Amenities", "Other"];

export function SuppliersPage({ suppliers, setSuppliers, setToast }: SuppliersPageProps) {
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | SupplierRecord["status"]>("All");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visibleSuppliers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesSearch = !needle || [supplier.name, supplier.email, supplier.phone, supplier.address, supplier.category, supplier.status].join(" ").toLowerCase().includes(needle);
      const matchesCategory = categoryFilter === "All" || supplier.category === categoryFilter;
      const matchesStatus = statusFilter === "All" || supplier.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [suppliers, search, categoryFilter, statusFilter]);

  function saveSupplier(supplier: SupplierRecord) {
    setSuppliers((current) => [supplier, ...current]);
    setDrawerOpen(false);
    setToast(`${supplier.name} saved`);
  }

  return (
    <main className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Suppliers</h2>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search..."
            className="focus-ring h-12 w-full rounded-md border border-line bg-white pl-11 pr-3 text-base"
          />
        </label>
        <button
          type="button"
          onClick={() => setFilterOpen((value) => !value)}
          className="inline-flex h-12 items-center gap-2 rounded-md border border-line bg-white px-5 text-sm font-semibold hover:bg-slate-50"
        >
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {filterOpen ? (
        <div className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-sm sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm">
              <option>All</option>
              {supplierCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | SupplierRecord["status"])} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm">
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-white shadow-sm">
        <div className="px-5 py-5">
          <h3 className="text-2xl font-semibold">Suppliers</h3>
        </div>

        {visibleSuppliers.length ? (
          <div className="overflow-x-auto px-5 pb-5">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-slate-500">
                  {["Name", "Email", "Phone", "Address", "Category", "Status"].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-line hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold">{supplier.name}</td>
                    <td className="px-4 py-4">{supplier.email || "-"}</td>
                    <td className="px-4 py-4">{supplier.phone || "-"}</td>
                    <td className="px-4 py-4">{supplier.address || "-"}</td>
                    <td className="px-4 py-4">{supplier.category}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${supplier.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                        {supplier.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-[260px] place-items-center px-5 pb-5 text-center">
            <div>
              <Package className="mx-auto h-12 w-12 text-slate-500" />
              <p className="mt-4 text-lg font-semibold">No suppliers found</p>
              <p className="mt-2 text-sm text-slate-500">Add a supplier to get started</p>
            </div>
          </div>
        )}
      </section>

      {drawerOpen ? <AddSupplierDrawer onClose={() => setDrawerOpen(false)} onSave={saveSupplier} /> : null}
    </main>
  );
}

function AddSupplierDrawer({ onClose, onSave }: { onClose: () => void; onSave: (supplier: SupplierRecord) => void }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    category: "",
    status: "Active" as SupplierRecord["status"]
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      id: `supplier-${Date.now()}`,
      name: form.name || "Unnamed Supplier",
      email: form.email,
      phone: form.phone,
      address: form.address,
      vatNo: "",
      commission: 0,
      category: form.category || "Other",
      status: form.status
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <aside className="h-full w-full max-w-[760px] overflow-y-auto rounded-l-2xl bg-white shadow-panel">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white px-7 py-6">
          <div>
            <h2 className="text-2xl font-semibold">Add Supplier</h2>
            <p className="mt-3 text-sm text-slate-500">Enter the details for the new supplier</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-7 py-6">
          <Field label="Name">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus required className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm" />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm" />
          </Field>
          <Field label="Address">
            <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm" />
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm">
              <option value="">Select a category</option>
              {supplierCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SupplierRecord["status"] })} className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="h-11 rounded-md border border-line bg-white px-5 text-sm font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="h-11 rounded-md bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-800">
              Save
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
