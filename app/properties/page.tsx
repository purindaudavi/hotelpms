"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Building2, LogOut, Plus, RefreshCw, Users, Trash2, X } from "lucide-react";
import { useColorScheme } from "@/app/components/hooks/use-color-scheme";
import { getApiErrorMessage } from "@/app/lib/api";
import { logoutUser } from "@/app/lib/auth-api";
import { hasStoredWorkspaceSession, loadCurrentSessionUser } from "@/app/lib/current-user";
import { PRODUCT_ICON_URL, PRODUCT_NAME } from "@/app/lib/product-brand";
import { blankPropertyDetails } from "@/app/lib/property-defaults";
import { createPropertyRecord } from "@/app/lib/property-api";
import { propertyDetailsStorageKey } from "@/app/lib/property-repository";
import { writeLocalStorageValue } from "@/app/components/hooks/use-local-storage-state";
import { listProperties, rememberProperty, propertyRoleLabel, type PropertySummary } from "@/app/lib/property-workspaces";
import { PropertyStaffAccess } from "@/app/components/property-staff-access";
import { PropertyDeletionDialog } from "@/app/components/property-deletion-requests";
import { listPropertyDeletions } from "@/app/lib/property-deletion-api";
import { getPropertyCreationAccess, type PropertyCreationAccess } from "@/app/lib/property-creation-api";

export default function PropertiesPage() {
  useColorScheme();
  const router = useRouter();
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [reviewer, setReviewer] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [access, setAccess] = useState<PropertySummary | null>(null);
  const [deletion, setDeletion] = useState<PropertySummary | null>(null);
  const [hasDeletionRequests, setHasDeletionRequests] = useState(false);
  const [creationAccess,setCreationAccess] = useState<PropertyCreationAccess|null>(null);
  async function refresh() {
    setLoading(true); setError("");
    try { const [values,allowance,deletions]=await Promise.all([listProperties(),getPropertyCreationAccess(),listPropertyDeletions(false,"all")]);setProperties(values);setCreationAccess(allowance);setHasDeletionRequests(deletions.length>0);if(!allowance.can_create)setCreating(false); }
    catch (failure) { setError(getApiErrorMessage(failure, "Unable to load your hotels. Check the backend connection and retry.")); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    document.title = `Your properties | ${PRODUCT_NAME}`;
    if (!hasStoredWorkspaceSession()) { router.replace("/login"); return; }
    const session = loadCurrentSessionUser();
    setReviewer(session.role === "admin" || session.role === "developer" || session.role === "integration_reviewer");
    if (session.mode === "demo") { setDemo(true); setLoading(false); return; }
    void refresh();
  }, [router]);
  async function signOut() { await logoutUser().catch(() => undefined); router.replace("/login"); }
  return <main className="app-shell-root min-h-screen bg-slate-50 text-ink">
    <header className="border-b border-line bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5"><div className="flex items-center gap-3"><img src={PRODUCT_ICON_URL} alt="" className="h-11 w-11 rounded-lg bg-white p-1" /><p className="text-sm font-semibold sm:text-base">{PRODUCT_NAME}</p></div><button onClick={() => void signOut()} className="flex shrink-0 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><LogOut className="h-4 w-4" />{demo ? "Sign in" : "Sign out"}</button></div></header>
    <div className="mx-auto max-w-6xl px-5 py-10">
      {reviewer && <Link href="/integration-review" className="mb-6 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">Open integration review queue</Link>}
      {creationAccess?.can_review ? <Link href="/platform/property-requests" className="mb-6 inline-flex rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-blue-600">Open PMS owner portal</Link>:null}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5"><div><h1 className="text-3xl font-semibold">Your properties</h1><p className="mt-2 text-sm text-slate-500">Choose a hotel to manage its rooms, reservations and settings.</p></div>{!demo && <div className="flex flex-wrap gap-3"><button onClick={() => void refresh()} disabled={loading} aria-label="Refresh properties" className="rounded-lg border border-line bg-white p-3 disabled:opacity-50"><RefreshCw className="h-5 w-5" /></button>{creationAccess?.can_create?<button onClick={() => { setCreating(true); setAccess(null); }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white"><Plus className="h-4 w-4" />Add property</button>:<Link href="/property-requests" className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white">Request property access</Link>}</div>}</div>
      {!demo&&creationAccess?<div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 text-sm"><p>{creationAccess.owned_count} owned · {creationAccess.approved_limit} approved · {creationAccess.remaining} available</p><div className="flex flex-wrap gap-4"><Link href="/property-requests" className="font-semibold text-blue-600">Property requests</Link>{(hasDeletionRequests || properties.some(property => ["owner", "administrator"].includes(property.role))) ? <Link href="/property-deletion-requests" className="font-semibold text-blue-600">Deletion requests</Link> : null}</div></div>:null}
      {demo && <section className="rounded-2xl border border-line bg-white p-8"><h2 className="text-xl font-semibold">You’re viewing the demo workspace</h2><p className="mt-3 text-slate-500">Sign in with your account to create a hotel and manage who can access it.</p><div className="mt-6 flex gap-5"><button onClick={() => void signOut()} className="font-semibold text-blue-600">Sign in / register</button><Link href="/properties/demo/dashboard" className="font-semibold text-blue-600">Return to demo</Link></div></section>}
      {error && <p role="alert" className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {creating && creationAccess?.can_create && <CreatePropertyForm onCancel={() => setCreating(false)} onCreated={(id) => { rememberProperty(id); router.push(`/properties/${encodeURIComponent(id)}/settings/property`); }} />}
      {access && <PropertyStaffAccess key={access.property_id} property={access} onClose={() => setAccess(null)} />}
      {deletion && <PropertyDeletionDialog key={deletion.property_id} propertyId={deletion.property_id} onClose={() => setDeletion(null)} />}
      {loading && <p role="status" className="py-12 text-center text-slate-500">Loading your properties…</p>}
      {!demo && !loading && !error && !properties.length && !creating && <section className="rounded-2xl border border-dashed border-line bg-white p-12 text-center"><Building2 className="mx-auto h-10 w-10 text-blue-600" /><h2 className="mt-4 text-xl font-semibold">No properties yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Request approval to create a property, or ask a hotel owner to grant staff access to your registered email.</p>{creationAccess?.can_create?<button onClick={() => setCreating(true)} className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white">Add your first property</button>:<Link href="/property-requests" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white">Request property access</Link>}</section>}
      {!demo && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{properties.map((property) => <article key={property.property_id} className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><Building2 className="h-6 w-6" /></span><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-600">{propertyRoleLabel(property.role)}</span>{(property.role === "owner" || property.role === "administrator") && <button type="button" title="Request property deletion" aria-label={`Request deletion of ${property.hotel_name}`} disabled={loading} onClick={() => { setDeletion(property); setAccess(null); setCreating(false); }} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>}</div></div><h2 className="text-lg font-semibold">{property.hotel_name}</h2><p className="mt-2 text-sm text-slate-500">{[property.city, property.country_code].filter(Boolean).join(", ")} · {property.home_currency}</p><div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4"><Link onClick={() => rememberProperty(property.property_id)} href={`/properties/${encodeURIComponent(property.property_id)}/dashboard`} className="flex items-center gap-2 text-sm font-semibold text-blue-600">Open hotel<ArrowRight className="h-4 w-4" /></Link>{(property.role === "owner" || property.role === "administrator") && <button onClick={() => { setAccess(property); setCreating(false); }} className="flex items-center gap-2 text-sm text-slate-500"><Users className="h-4 w-4" />Access</button>}</div></article>)}</div>}
    </div>
  </main>;
}

function CreatePropertyForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [id] = useState(() => `hotel-${crypto.randomUUID()}`);
  const [details, setDetails] = useState(blankPropertyDetails);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError("");
    try {
      const result = await createPropertyRecord(id, details);
      writeLocalStorageValue(propertyDetailsStorageKey(id), result.details);
      writeLocalStorageValue(`staypilot:${id}:property:currencies`, [{ id: details.homeCurrency, code: details.homeCurrency, name: details.homeCurrency, symbol: details.homeCurrency, hotelToCurrency: 1, isDefault: true }]);
      onCreated(id);
    } catch (failure) { setError(getApiErrorMessage(failure, "Property could not be created.")); setSaving(false); }
  }
  const fields = [
    ["hotelName", "Hotel name", "text", true], ["email", "Hotel email", "email", true],
    ["address", "Address", "text", true], ["city", "City", "text", false],
    ["country", "Country code (e.g. LK)", "text", true], ["homeCurrency", "Currency (e.g. LKR)", "text", true],
    ["phone", "Hotel phone", "tel", false], ["timezone", "Timezone (e.g. Asia/Colombo)", "text", true]
  ] as const;
  return <form onSubmit={(event) => void submit(event)} className="mb-8 rounded-2xl border border-line bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Add a property</h2><button type="button" aria-label="Close form" onClick={onCancel} disabled={saving}><X className="h-5 w-5" /></button></div><p className="mt-2 text-sm text-slate-500">You’ll be the owner. Add rooms, rates, a logo and staff access after creating the hotel.</p><div className="mt-6 grid gap-5 sm:grid-cols-2">{fields.map(([key, label, type, required]) => <label key={key} className="text-sm font-medium">{label}{required ? " *" : ""}<input required={required} disabled={saving} type={type} value={details[key]} maxLength={key === "country" ? 2 : key === "homeCurrency" ? 3 : 254} minLength={key === "hotelName" || key === "country" ? 2 : key === "homeCurrency" ? 3 : undefined} onChange={(event) => setDetails((value) => ({ ...value, [key]: ["country", "homeCurrency"].includes(key) ? event.target.value.toUpperCase() : event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 font-normal text-ink" /></label>)}</div>{error && <p role="alert" className="mt-4 text-sm text-rose-600">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-line px-4 py-2.5">Cancel</button><button disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : "Create property"}</button></div></form>;
}
