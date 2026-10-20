"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { listProperties, rememberProperty, type PropertySummary } from "@/app/lib/property-workspaces";
import { loadCurrentSessionUser } from "@/app/lib/current-user";
import { getApiErrorMessage } from "@/app/lib/api";

export function PropertySwitcher({ propertyId, hotelName, collapsed }: { propertyId: string; hotelName: string; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    function dismiss(event: MouseEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", dismiss); document.addEventListener("keydown", escape);
    setLoading(true); setError("");
    if (loadCurrentSessionUser().mode === "demo") { setError("Sign in to add and switch between your hotels."); setLoading(false); }
    else { void listProperties().then((items) => { if (active) setProperties(items); }).catch((failure) => { if (active) setError(getApiErrorMessage(failure, "Unable to load hotels.")); }).finally(() => { if (active) setLoading(false); }); }
    return () => { active = false; document.removeEventListener("mousedown", dismiss); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div ref={container} className="static">
    <button type="button" aria-label="Switch property" title="Switch property" aria-expanded={open} aria-controls="property-switcher-panel" onClick={() => setOpen((value) => !value)} className={`rounded-md border border-transparent p-1 text-slate-500 hover:border-line hover:bg-slate-100 ${collapsed ? "lg:absolute lg:right-1 lg:top-1" : ""}`}><ChevronDown className="h-4 w-4" /></button>
    {open && <div id="property-switcher-panel" className={`absolute left-0 top-full z-[80] mt-2 w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-white text-ink shadow-xl ${collapsed ? "lg:w-72" : ""}`}>
      <div className="border-b border-line px-4 py-3"><p className="text-sm font-semibold">Switch property</p><p className="mt-1 truncate text-xs text-slate-500">{hotelName}</p></div>
      <div className="max-h-72 overflow-y-auto p-2">{loading && <p className="p-3 text-sm text-slate-500">Loading hotels…</p>}{error && <p role="status" className="p-3 text-sm text-slate-500">{error}</p>}{!loading && !error && properties.map((property) => <Link key={property.property_id} href={`/properties/${encodeURIComponent(property.property_id)}/dashboard`} onClick={() => { rememberProperty(property.property_id); setOpen(false); }} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-slate-50 ${property.property_id === propertyId ? "bg-blue-50 text-blue-600" : ""}`}><Building2 className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{property.hotel_name}</span>{property.property_id === propertyId && <Check className="h-4 w-4" />}</Link>)}</div>
      <Link href="/properties" onClick={() => setOpen(false)} className="flex items-center gap-2 border-t border-line px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-slate-50"><Plus className="h-4 w-4" />Manage / add properties</Link>
    </div>}
  </div>;
}
