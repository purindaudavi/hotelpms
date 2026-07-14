"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import { Edit3, Save } from "lucide-react";
import type { GatewayName, GatewaySettings } from "./property-types";

const names: GatewayName[] = ["CyberSource", "PayPal", "Skrill", "Stripe", "Google Pay", "Apple Pay"];

export function PaymentGatewayTab({ gateways, setGateways, setToast }: { gateways: Record<GatewayName, GatewaySettings>; setGateways: Dispatch<SetStateAction<Record<GatewayName, GatewaySettings>>>; setToast: (message: string) => void }) {
  const [active, setActive] = useState<GatewayName>("CyberSource");
  const [editing, setEditing] = useState(false);
  const value = gateways[active];
  const set = (key: keyof GatewaySettings, next: string | boolean) => setGateways((current) => ({ ...current, [active]: { ...current[active], [key]: next } }));
  function toggleEditing() { if (editing) setToast(`${active} gateway settings saved for this session`); setEditing((current) => !current); }

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Payment Gateways</h2><p className="mt-1 text-sm text-slate-500">Configure your preferred Internet Payment Gateways per provider.</p></div><div className="table-scroll max-w-full overflow-x-auto rounded-lg bg-slate-100 p-1"><div className="flex min-w-max">{names.map((name) => <button key={name} onClick={() => { setActive(name); setEditing(false); }} className={`rounded-md px-4 py-2 text-sm font-semibold ${active === name ? "bg-white shadow-sm" : "text-slate-500"}`}>{name}</button>)}</div></div></div>
    <section className="mt-4 rounded-lg border border-line p-6 lg:p-10"><div className="mb-6 flex items-center justify-between"><h3 className="font-semibold">{active} — Payment Gateway Settings</h3><button onClick={toggleEditing} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white">{editing ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}{editing ? "Save" : "Edit"}</button></div>
      <div className="mb-6 space-y-4"><Toggle label="is IPG Active" checked={value.active} setChecked={(v) => set("active", v)} disabled={!editing} /><Toggle label="is Sandbox Active" checked={value.sandbox} setChecked={(v) => set("sandbox", v)} disabled={!editing} /></div>
      {active === "PayPal" ? <div className="grid gap-5 md:grid-cols-2"><Field label="Merchant Id" value={value.paypalMerchantId} onChange={(v) => set("paypalMerchantId", v)} disabled={!editing} /><div><p className="mb-2 text-sm font-semibold">PayPal Partner Setup</p><button type="button" disabled={!editing} onClick={() => { set("paypalConnected", true); setToast("PayPal connected for this session"); }} className="h-11 rounded-md border border-line px-4 text-sm font-semibold disabled:opacity-50">{value.paypalConnected ? "PayPal Connected" : "Connect PayPal"}</button><p className="mt-2 text-xs text-slate-500">Simulates PayPal onboarding and retains the connection in this session.</p></div></div> : <GatewayFields value={value} set={set} disabled={!editing} />}
    </section>
  </div>;
}

function GatewayFields({ value, set, disabled }: { value: GatewaySettings; set: (key: keyof GatewaySettings, value: string | boolean) => void; disabled: boolean }) {
  const fields: [string, keyof GatewaySettings, string?][] = [["IPG Bank Name", "bankName"], ["IPG Name", "ipgName"], ["Merchant Id USD", "merchantIdUsd"], ["Profile ID USD", "profileIdUsd"], ["Access Key USD", "accessKeyUsd"], ["SecretKey USD", "secretKeyUsd", "password"], ["Merchant Id LKR", "merchantIdLkr"], ["Profile ID LKR", "profileIdLkr"], ["Access Key LKR", "accessKeyLkr"], ["SecretKey LKR", "secretKeyLkr", "password"]];
  return <div className="grid gap-5 md:grid-cols-2">{fields.map(([label, key, type]) => <Field key={key} label={label} value={String(value[key])} onChange={(v) => set(key, v)} disabled={disabled} type={type} />)}</div>;
}
function Field({ label, value, onChange, disabled, type = "text" }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; type?: string }) { return <label><span className="mb-2 block text-sm font-semibold">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="focus-ring h-12 w-full rounded-md border border-line px-3 disabled:bg-slate-50 disabled:text-slate-500" /></label>; }
function Toggle({ label, checked, setChecked, disabled }: { label: string; checked: boolean; setChecked: (value: boolean) => void; disabled: boolean }) { return <div className="flex items-center gap-3"><button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => setChecked(!checked)} className={`relative h-7 w-12 rounded-full ${checked ? "bg-ocean" : "bg-slate-200"} disabled:opacity-60`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} /></button><span className="text-sm">{label}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${checked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{checked ? "Active" : "Inactive"}</span></div>; }
