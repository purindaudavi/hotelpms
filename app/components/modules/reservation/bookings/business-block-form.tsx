"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { roomTypes, type Reservation } from "@/app/data/pms-data";
import { currentSessionUser } from "@/app/lib/current-user";
import { createUuid } from "@/app/lib/record-ids";
import type { RatePlan } from "../../front-desk/types";
import { addDays } from "../../front-desk/utils";
import type { BusinessBlock, BusinessBlockAllocation, BusinessBlockStatus } from "../types";

type Props = {
  propertyId: string;
  businessDate: string;
  homeCurrency: string;
  ratePlans: RatePlan[];
  block: BusinessBlock | null;
  reservations: Reservation[];
  onClose: () => void;
  onSave: (block: BusinessBlock) => string | void;
};

export function BusinessBlockForm({ propertyId, businessDate, homeCurrency, ratePlans, block, onClose, onSave }: Props) {
  const [form, setForm] = useState<BusinessBlock>(() => block ? structuredClone(block) : newBusinessBlock(propertyId, businessDate, homeCurrency, ratePlans));
  const [error, setError] = useState("");

  function update<K extends keyof BusinessBlock>(key: K, value: BusinessBlock[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function updateAllocation(id: string, patch: Partial<BusinessBlockAllocation>) {
    setForm((current) => ({ ...current, allocations: current.allocations.map((line) => line.id === id ? { ...line, ...patch } : line) }));
  }
  function changeRoomType(line: BusinessBlockAllocation, roomTypeId: string) {
    const type = roomTypes.find((item) => item.id === roomTypeId) ?? roomTypes[0];
    const plan = ratePlans.find((item) => item.id === line.ratePlanId);
    updateAllocation(line.id, { roomTypeId: type.id, roomTypeName: type.name, negotiatedRate: plan?.roomTypeRates[type.id] ?? type.baseRate });
  }
  function changeRatePlan(line: BusinessBlockAllocation, ratePlanId: string) {
    const plan = ratePlans.find((item) => item.id === ratePlanId);
    updateAllocation(line.id, { ratePlanId, ratePlanName: plan?.name || "", mealPlan: plan?.mealPlan || line.mealPlan, currency: plan?.currency || line.currency, negotiatedRate: plan?.roomTypeRates[line.roomTypeId] ?? line.negotiatedRate });
  }
  function addAllocation() {
    const used = new Set(form.allocations.map((line) => line.roomTypeId));
    const type = roomTypes.find((item) => !used.has(item.id)) ?? roomTypes[0];
    const plan = ratePlans[0];
    setForm((current) => ({ ...current, allocations: [...current.allocations, allocationDraft(propertyId, current.id, type.id, type.name, homeCurrency, plan)] }));
  }
  function removeAllocation(id: string) {
    if (form.allocations.length === 1) { setError("At least one room allocation is required."); return; }
    if (window.confirm("Remove this room-type allocation?")) update("allocations", form.allocations.filter((line) => line.id !== id));
  }

  function submit() {
    const validation = validateBlock(form, businessDate, Boolean(block));
    if (validation) { setError(validation); return; }
    const result = onSave({ ...form, updatedAt: new Date().toISOString() });
    if (result) setError(result);
  }

  return <div className="fixed inset-0 z-[60] bg-black/45"><aside className="ml-auto flex h-full w-full max-w-[1050px] flex-col bg-white shadow-2xl">
    <header className="flex items-start justify-between border-b border-line px-6 py-4"><div><h2 className="text-xl font-semibold">{block ? "Edit" : "Create"} Business Block</h2><p className="mt-1 text-sm text-slate-500">Block {form.blockNumber}</p></div><button type="button" onClick={onClose} className="rounded-md border border-line p-2"><X className="h-5 w-5" /></button></header>
    <div className="flex-1 space-y-6 overflow-y-auto p-6">
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <FormSection title="Basic information"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><BlockInput label="Block name" value={form.blockName} onChange={(value) => update("blockName", value)} /><BlockInput label="Company or Travel Agent" value={form.companyName} onChange={(value) => update("companyName", value)} /><BlockInput label="Contact name" value={form.contactName} onChange={(value) => update("contactName", value)} /><BlockInput label="Contact email" value={form.contactEmail} onChange={(value) => update("contactEmail", value)} type="email" /><BlockInput label="Contact phone" value={form.contactPhone} onChange={(value) => update("contactPhone", value)} /><BlockSelect label="Status" value={form.status} onChange={(value) => update("status", value as BusinessBlockStatus)} options={["Tentative", "Active", "Released", "Cancelled", "Completed"]} /></div></FormSection>
      <FormSection title="Dates"><div className="grid gap-4 md:grid-cols-3"><BlockInput label="Check-in" value={form.checkIn} onChange={(value) => update("checkIn", value)} type="date" /><BlockInput label="Check-out" value={form.checkOut} onChange={(value) => update("checkOut", value)} type="date" /><BlockInput label="Cut-off / Release Date" value={form.cutoffDate} onChange={(value) => update("cutoffDate", value)} type="date" /></div></FormSection>
      <FormSection title="Room allocations" action={<button type="button" onClick={addAllocation} className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add Room Type</button>}>
        <div className="overflow-x-auto"><table className="min-w-[1100px] text-left text-sm"><thead><tr className="border-b border-line text-slate-500">{["Room Type", "Quantity", "Rate Plan", "Meal Plan", "Currency", "Rate/Night", "Tax incl.", "FOC", "Reason", ""].map((heading) => <th key={heading} className="px-2 py-3">{heading}</th>)}</tr></thead><tbody>{form.allocations.map((line) => <tr key={line.id} className="border-b border-line">
          <td className="px-2 py-2"><select value={line.roomTypeId} onChange={(event) => changeRoomType(line, event.target.value)} className="h-10 w-44 rounded-md border border-line px-2">{roomTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></td>
          <td className="px-2 py-2"><input type="number" min="1" max={roomTypes.find((type) => type.id === line.roomTypeId)?.rooms.length} value={line.quantity} onChange={(event) => updateAllocation(line.id, { quantity: Number(event.target.value) })} className="h-10 w-20 rounded-md border border-line px-2" /></td>
          <td className="px-2 py-2"><select value={line.ratePlanId || ""} onChange={(event) => changeRatePlan(line, event.target.value)} className="h-10 w-40 rounded-md border border-line px-2"><option value="">Custom rate</option>{ratePlans.filter((plan) => plan.active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></td>
          <td className="px-2 py-2"><select value={line.mealPlan} onChange={(event) => updateAllocation(line.id, { mealPlan: event.target.value })} className="h-10 w-36 rounded-md border border-line px-2"><option>Room Only</option><option>Breakfast</option><option>Half Board</option><option>Full Board</option><option>All Inclusive</option></select></td>
          <td className="px-2 py-2"><input value={line.currency} onChange={(event) => updateAllocation(line.id, { currency: event.target.value.toUpperCase() })} className="h-10 w-20 rounded-md border border-line px-2" /></td>
          <td className="px-2 py-2"><input type="number" min="0" value={line.negotiatedRate} onChange={(event) => updateAllocation(line.id, { negotiatedRate: Number(event.target.value) })} className="h-10 w-28 rounded-md border border-line px-2" /></td>
          <td className="px-2 py-2 text-center"><input type="checkbox" checked={line.taxInclusive} onChange={(event) => updateAllocation(line.id, { taxInclusive: event.target.checked })} /></td>
          <td className="px-2 py-2 text-center"><input type="checkbox" checked={line.isComplimentary} onChange={(event) => updateAllocation(line.id, { isComplimentary: event.target.checked, negotiatedRate: event.target.checked ? 0 : line.negotiatedRate })} /></td>
          <td className="px-2 py-2"><input value={line.complimentaryReason || ""} disabled={!line.isComplimentary} onChange={(event) => updateAllocation(line.id, { complimentaryReason: event.target.value })} className="h-10 w-44 rounded-md border border-line px-2 disabled:bg-slate-100" /></td>
          <td className="px-2 py-2"><button type="button" onClick={() => removeAllocation(line.id)} className="rounded p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></td>
        </tr>)}</tbody></table></div>
      </FormSection>
      <FormSection title="Billing"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><BlockInput label="Payment method" value={form.paymentMethod || ""} onChange={(value) => update("paymentMethod", value)} /><BlockSelect label="Billing party" value={form.billingParty} onChange={(value) => update("billingParty", value as BusinessBlock["billingParty"])} options={["Company", "Guest", "Travel Agent", "Split"]} /><BlockInput label="Deposit required" value={String(form.depositRequired)} onChange={(value) => update("depositRequired", Number(value))} type="number" /><BlockInput label="Deposit paid" value={String(form.depositPaid)} onChange={(value) => update("depositPaid", Number(value))} type="number" /><BlockInput label="Payment due date" value={form.paymentDueDate || ""} onChange={(value) => update("paymentDueDate", value)} type="date" /><BlockArea label="Billing remarks" value={form.billingRemarks || ""} onChange={(value) => update("billingRemarks", value)} /></div></FormSection>
      <FormSection title="Policies and notes"><div className="grid gap-4 md:grid-cols-2"><BlockArea label="Cancellation policy" value={form.cancellationPolicy || ""} onChange={(value) => update("cancellationPolicy", value)} /><BlockArea label="Block remarks" value={form.blockRemarks || ""} onChange={(value) => update("blockRemarks", value)} /><BlockArea label="Internal remarks · Staff only" value={form.internalRemarks || ""} onChange={(value) => update("internalRemarks", value)} /><BlockArea label="Special requirements" value={form.specialRequirements || ""} onChange={(value) => update("specialRequirements", value)} /></div></FormSection>
    </div>
    <footer className="flex justify-end gap-2 border-t border-line p-4"><button type="button" onClick={onClose} className="rounded-md border border-line px-5 py-2 font-semibold">Cancel</button><button type="button" onClick={submit} className="rounded-md bg-ink px-5 py-2 font-semibold text-white">Save Business Block</button></footer>
  </aside></div>;
}

function newBusinessBlock(propertyId: string, businessDate: string, currency: string, ratePlans: RatePlan[]): BusinessBlock {
  const id = createUuid(); const now = new Date().toISOString(); const type = roomTypes[0]; const plan = ratePlans[0];
  return { id, propertyId, blockNumber: `BB-${businessDate.replaceAll("-", "").slice(2)}-${id.slice(0, 4).toUpperCase()}`, blockName: "", companyName: "", contactName: "", contactEmail: "", contactPhone: "", checkIn: businessDate, checkOut: addDays(businessDate, 1), cutoffDate: businessDate, status: "Tentative", paymentMethod: "", billingParty: "Company", depositRequired: 0, depositPaid: 0, paymentDueDate: "", billingRemarks: "", cancellationPolicy: "", blockRemarks: "", internalRemarks: "", specialRequirements: "", allocations: [allocationDraft(propertyId, id, type.id, type.name, currency, plan)], createdBy: currentSessionUser.name, createdAt: now, updatedAt: now };
}
function allocationDraft(propertyId: string, blockId: string, roomTypeId: string, roomTypeName: string, currency: string, plan?: RatePlan): BusinessBlockAllocation { return { id: createUuid(), propertyId, businessBlockId: blockId, roomTypeId, roomTypeName, quantity: 1, ratePlanId: plan?.id || "", ratePlanName: plan?.name || "", mealPlan: plan?.mealPlan || "Room Only", currency: plan?.currency || currency, negotiatedRate: plan?.roomTypeRates[roomTypeId] ?? roomTypes.find((type) => type.id === roomTypeId)?.baseRate ?? 0, taxInclusive: false, isComplimentary: false, complimentaryReason: "", releasedQuantity: 0 }; }
function validateBlock(block: BusinessBlock, businessDate: string, editing: boolean) { if (!block.blockName.trim()) return "Block name is required."; if (!block.companyName.trim()) return "Company or Travel Agent is required."; if (block.checkOut <= block.checkIn) return "Check-out must be after check-in."; if (block.cutoffDate > block.checkIn) return "Cut-off date cannot be after check-in."; if (!editing && block.checkIn < businessDate) return "A new future block cannot start before the business date."; if (!block.allocations.length) return "At least one room allocation is required."; if (new Set(block.allocations.map((line) => line.roomTypeId)).size !== block.allocations.length) return "Duplicate room-type allocations are not allowed."; for (const line of block.allocations) { const type = roomTypes.find((item) => item.id === line.roomTypeId); if (!line.quantity || line.quantity < 1) return `Enter a quantity for ${line.roomTypeName}.`; if (line.quantity > (type?.rooms.length || 0)) return `${line.roomTypeName} has only ${type?.rooms.length || 0} configured rooms.`; if (line.negotiatedRate <= 0 && !line.isComplimentary) return `Enter a rate for ${line.roomTypeName}, or explicitly mark it complimentary.`; if (line.isComplimentary && !line.complimentaryReason?.trim()) return `Enter a complimentary reason for ${line.roomTypeName}.`; } if (block.depositPaid > block.depositRequired && block.depositRequired > 0) return "Deposit paid cannot exceed the required deposit."; return ""; }
function FormSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-lg border border-line p-5"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">{title}</h3>{action}</div>{children}</section>; }
function BlockInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="grid gap-1 text-sm font-semibold">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-md border border-line px-3 font-normal" /></label>; }
function BlockSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="grid gap-1 text-sm font-semibold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3 font-normal">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function BlockArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid gap-1 text-sm font-semibold">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 rounded-md border border-line p-3 font-normal" /></label>; }
