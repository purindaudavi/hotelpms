"use client";

import { type FormEvent, useMemo, useState } from "react";
import { readLocalStorageValue, useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { Edit3, Eye, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";

type Employee = { id: string; employeeNo: string; name: string; department: string; status: string; phone: string; email: string; joined: string };
const initialEmployees: Employee[] = [{ id: "employee-01", employeeNo: "01", name: "Asiri Perera", department: "Front Desk", status: "Active", phone: "0703551339", email: "asiri.business@gmail.com", joined: "2026-05-27T12:31:57.11Z" }];
export function EmployeePage({ propertyId }: { propertyId: string }) {
  const [employees, setEmployees] = useLocalStorageState<Employee[]>(`staypilot:${propertyId}:settings:employees`, () => readLocalStorageValue("staypilot.settings.employees", initialEmployees));
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<{ mode: "view" | "edit" | "new"; employee?: Employee } | null>(null);
  const visible = useMemo(() => employees.filter((employee) => Object.values(employee).join(" ").toLowerCase().includes(search.toLowerCase())), [employees, search]);

  function save(employee: Employee) {
    setEmployees((items) => items.some((item) => item.id === employee.id) ? items.map((item) => item.id === employee.id ? employee : item) : [employee, ...items]);
    setDrawer(null);
  }

  return <main className="space-y-5 p-4 lg:p-6">
    <header className="flex items-center justify-between"><h1 className="text-3xl font-bold">Hotel Employees</h1><div className="flex gap-2"><button className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-4 font-semibold"><RefreshCw className="h-4 w-4" />Refresh</button><button onClick={() => setDrawer({ mode: "new" })} className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 font-semibold text-white"><Plus className="h-4 w-4" />New Employee</button></div></header>
    <section className="rounded-lg border border-line bg-white p-6"><h2 className="flex items-center gap-2 text-2xl font-semibold"><Search className="h-5 w-5" />Search</h2><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by No / Name / Dept / Email / Phone / Status" className="focus-ring mt-3 h-11 w-full max-w-xl rounded-md border border-line px-3" /></section>
    <section className="rounded-lg border border-line bg-white p-6"><h2 className="mb-5 text-2xl font-semibold">Employees ({visible.length})</h2><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b border-line text-slate-500">{["Emp No", "Name", "Department", "Status", "Phone", "Email", "Joined", "Actions"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{visible.map((employee) => <tr key={employee.id} className="border-b border-line"><td className="px-4 py-4">{employee.employeeNo}</td><td className="px-4 py-4 font-semibold">{employee.name}</td><td className="px-4 py-4">{employee.department}</td><td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${employee.status.toLowerCase() === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{employee.status}</span></td><td className="px-4 py-4">{employee.phone}</td><td className="px-4 py-4">{employee.email}</td><td className="px-4 py-4">{new Date(employee.joined).toLocaleString()}</td><td className="px-4 py-4"><div className="flex gap-3"><button title="View" onClick={() => setDrawer({ mode: "view", employee })}><Eye className="h-4 w-4" /></button><button title="Edit" onClick={() => setDrawer({ mode: "edit", employee })}><Edit3 className="h-4 w-4" /></button><button title="Delete" onClick={() => setEmployees((items) => items.filter((item) => item.id !== employee.id))} className="text-rose-500"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div></section>
    {drawer ? <EmployeeDrawer mode={drawer.mode} employee={drawer.employee} onClose={() => setDrawer(null)} onSave={save} /> : null}
  </main>;
}

function EmployeeDrawer({ mode, employee, onClose, onSave }: { mode: "view" | "edit" | "new"; employee?: Employee; onClose: () => void; onSave: (employee: Employee) => void }) {
  const [form, setForm] = useState<Employee>(employee ?? { id: `employee-${Date.now()}`, employeeNo: "", name: "", department: "", status: "Active", phone: "", email: "", joined: new Date().toISOString() });
  const readOnly = mode === "view";
  function submit(event: FormEvent) { event.preventDefault(); onSave(form); }
  const title = mode === "new" ? "New Employee" : mode === "edit" ? "Edit Employee" : "Employee Details";
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"><aside className="h-full w-full max-w-[610px] overflow-y-auto bg-white p-7 shadow-2xl"><header className="flex justify-between"><div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-2 text-slate-500">{readOnly ? "View employee details" : mode === "new" ? "Fill details and click Create" : "Update details and click Save"}</p></div><button onClick={onClose}><X className="h-5 w-5" /></button></header><form onSubmit={submit} className="mt-7 space-y-5">{([ ["Employee No", "employeeNo", "text"], ["Name", "name", "text"], ["Department", "department", "text"], ["Status", "status", "text"], ["Phone", "phone", "tel"], ["Email", "email", "email"], ["Joined (ISO)", "joined", "text"] ] as const).map(([label, key, type]) => <label key={key}><span className="mb-2 block text-xs font-bold uppercase text-slate-500">{label}</span><input required type={type} readOnly={readOnly} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="focus-ring h-12 w-full rounded-md border border-line px-3 read-only:bg-slate-50" /></label>)}<div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="h-11 px-5 font-semibold">{readOnly ? "Close" : "Cancel"}</button>{!readOnly ? <button className="h-11 rounded-md bg-ink px-5 font-semibold text-white">{mode === "new" ? "Create" : "Save"}</button> : null}</div></form></aside></div>;
}
