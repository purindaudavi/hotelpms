"use client";

import { type ChangeEvent, type Dispatch, type SetStateAction, useState } from "react";
import { Upload } from "lucide-react";
import type { PropertyDetails } from "./property-types";

const mapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d20456.308902275196!2d79.97943542897703!3d7.092857117850915!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2fb3f156d17f3%3A0xad2c3c518cc12644!2sDMS%20-%20Digital%20Marketing%20Strategies%20(Pvt)%20Ltd.!5e1!3m2!1sen!2slk!4v1783660505916!5m2!1sen!2slk";

export function PropertyInfo({ value, onChange, editing, setToast }: { value: PropertyDetails; onChange: Dispatch<SetStateAction<PropertyDetails>>; editing: boolean; setToast: (message: string) => void }) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const set = (key: keyof PropertyDetails, next: string | boolean) => onChange((current) => ({ ...current, [key]: next }));

  function chooseLogo(event: ChangeEvent<HTMLInputElement>) { setLogoFile(event.target.files?.[0] ?? null); }
  function uploadLogo() {
    if (!logoFile) return;
    const url = URL.createObjectURL(logoFile);
    const image = new Image();
    image.onload = () => onChange((current) => ({ ...current, logoUrl: url, logoWidth: String(image.naturalWidth), logoHeight: String(image.naturalHeight) }));
    image.src = url;
    setLogoFile(null);
    setToast("Hotel logo saved for this session");
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="space-y-5">
          <Input label="Hotel Name" value={value.hotelName} onChange={(v) => set("hotelName", v)} disabled={!editing} />
          <Input label="Hotel GUID" value={value.hotelGuid} onChange={(v) => set("hotelGuid", v)} disabled={!editing} />
          <Input label="Number of Rooms" value={value.numberOfRooms} onChange={(v) => set("numberOfRooms", v)} disabled={!editing} type="number" />
          <Input label="Plan" value={value.plan} onChange={(v) => set("plan", v)} disabled={!editing} />
        </div>
        <div className="space-y-5">
          <Input label="Hotel Type" value={value.hotelType} onChange={(v) => set("hotelType", v)} disabled={!editing} />
          <Input label="Star Category" value={value.starCategory} onChange={(v) => set("starCategory", v)} disabled={!editing} type="number" />
          <Switch label="On Trial" checked={value.onTrial} onChange={(v) => set("onTrial", v)} disabled={!editing} />
        </div>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Hotel Logo</h2>
          <div className="rounded-lg border border-line p-5">
            <p className="mb-3 text-sm text-slate-500">Current logo</p>
            <div className="mx-auto grid h-44 max-w-52 place-items-center overflow-hidden rounded-lg border border-line bg-slate-950 text-3xl font-bold text-white">
              {value.logoUrl ? <img src={value.logoUrl} alt="Current hotel logo" className="h-full w-full object-contain" /> : "SP"}
            </div>
            <label className="mt-5 block text-sm font-semibold">Upload new logo<input type="file" accept="image/*" onChange={chooseLogo} disabled={!editing} className="mt-2 block w-full rounded-md border border-line p-2 text-sm disabled:opacity-60" /></label>
            <button type="button" onClick={uploadLogo} disabled={!editing || !logoFile} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40"><Upload className="h-4 w-4" />Upload & Save</button>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
            <Input label="Logo Width" value={value.logoWidth} onChange={(v) => set("logoWidth", v)} disabled={!editing} type="number" />
            <Input label="Logo Height" value={value.logoHeight} onChange={(v) => set("logoHeight", v)} disabled={!editing} type="number" />
          </div>
        </section>
      </div>

      <TextArea label="Hotel Description" value={value.description} onChange={(v) => set("description", v)} disabled={!editing} />
      <div className="grid gap-5 md:grid-cols-2">
        <Input label="Hotel Address" value={value.address} onChange={(v) => set("address", v)} disabled={!editing} /><Input label="City" value={value.city} onChange={(v) => set("city", v)} disabled={!editing} />
        <Input label="Zip Code" value={value.zipCode} onChange={(v) => set("zipCode", v)} disabled={!editing} /><Input label="Country" value={value.country} onChange={(v) => set("country", v)} disabled={!editing} />
        <Input label="Hotel Phone" value={value.phone} onChange={(v) => set("phone", v)} disabled={!editing} /><Input label="Hotel Email" value={value.email} onChange={(v) => set("email", v)} disabled={!editing} type="email" />
        <Input label="Hotel Website" value={value.website} onChange={(v) => set("website", v)} disabled={!editing} /><Input label="Check-in Time" value={value.checkInTime} onChange={(v) => set("checkInTime", v)} disabled={!editing} type="time" />
        <Input label="Check-out Time" value={value.checkOutTime} onChange={(v) => set("checkOutTime", v)} disabled={!editing} type="time" /><Input label="Home Currency" value={value.homeCurrency} onChange={(v) => set("homeCurrency", v)} disabled={!editing} />
        <Input label="Language Code" value={value.languageCode} onChange={(v) => set("languageCode", v)} disabled={!editing} /><Input label="IBE Logo Width" value={value.ibeLogoWidth} onChange={(v) => set("ibeLogoWidth", v)} disabled={!editing} type="number" />
        <Input label="IBE Logo Height" value={value.ibeLogoHeight} onChange={(v) => set("ibeLogoHeight", v)} disabled={!editing} type="number" /><Input label="Support PIN" value={value.supportPin} onChange={(v) => set("supportPin", v)} disabled={!editing} />
      </div>
      <TextArea label="Invoice Footer" value={value.invoiceFooter} onChange={(v) => set("invoiceFooter", v)} disabled={!editing} />
      <TextArea label="Invoice Notes" value={value.invoiceNotes} onChange={(v) => set("invoiceNotes", v)} disabled={!editing} />

      <section><h2 className="mb-4 text-lg font-semibold">System Metadata</h2><div className="grid gap-5 md:grid-cols-2">
        <Input label="Created On" value={value.createdOn} disabled /><Input label="Created Timestamp" value={value.createdTimestamp} disabled /><Input label="Last Updated On" value={value.lastUpdatedOn} disabled /><Input label="Last Updated Timestamp" value={value.lastUpdatedTimestamp} disabled /><Input label="Last Updated By (User GUID)" value={value.lastUpdatedBy} disabled />
      </div></section>
      <section><h2 className="mb-4 text-lg font-semibold">Channel Manager</h2><div className="grid gap-5 md:grid-cols-2">
        <Input label="CM Property ID" value={value.cmPropertyId} onChange={(v) => set("cmPropertyId", v)} disabled={!editing} /><Switch label="CM Active" checked={value.cmActive} onChange={(v) => set("cmActive", v)} disabled={!editing} />
        <Input label="Latitude" value={value.latitude} onChange={(v) => set("latitude", v)} disabled={!editing} /><Input label="Longitude" value={value.longitude} onChange={(v) => set("longitude", v)} disabled={!editing} />
      </div><p className="mb-2 mt-5 text-sm font-semibold">Location on Map</p><iframe title="Property location" src={mapUrl} width="600" height="450" className="h-[450px] w-full rounded-lg border-0" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></section>
    </div>
  );
}

function Input({ label, value, onChange, disabled, type = "text" }: { label: string; value: string; onChange?: (value: string) => void; disabled?: boolean; type?: string }) { return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><input type={type} value={value} onChange={(e) => onChange?.(e.target.value)} disabled={disabled} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm disabled:bg-slate-50 disabled:text-slate-500" /></label>; }
function TextArea({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) { return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="focus-ring min-h-28 w-full rounded-md border border-line p-3 text-sm disabled:bg-slate-50 disabled:text-slate-500" /></label>; }
function Switch({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled: boolean }) { return <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><span>{label}</span><button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-ocean" : "bg-slate-300"} disabled:opacity-50`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} /></button><span className="text-xs text-slate-500">{checked ? "Yes" : "No"}</span></label>; }
