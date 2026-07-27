"use client";

import { FormEvent, useState } from "react";
import { CalendarDays } from "lucide-react";
import { property } from "@/app/data/pms-data";
import { createUuid } from "@/app/lib/record-ids";
import { currencyOptions, mealPlanOptions, rateCodeOptions } from "../constants";
import type { RatePlan, RoomTypeRecord } from "../types";
import { addDays } from "../utils";
import { Drawer, Field, SelectInput, TextInput, ToolbarButton } from "./rooms-rates-ui";

export function RatePlanDrawer({
  mode,
  propertyId,
  ratePlan,
  ratePlans,
  roomTypes,
  onClose,
  onSave
}: {
  mode: "create" | "edit";
  propertyId: string;
  ratePlan: RatePlan | null;
  ratePlans: RatePlan[];
  roomTypes: RoomTypeRecord[];
  onClose: () => void;
  onSave: (plan: RatePlan) => void;
}) {
  const activeRoomTypes = roomTypes.filter((type) => type.active);
  const now = new Date().toISOString();
  const [form, setForm] = useState<RatePlan>(() => ratePlan ?? {
    id: createUuid(),
    propertyId,
    name: "",
    code: "FIT",
    currency: property.currency,
    mealPlan: "Room Only",
    baseRate: activeRoomTypes[0]?.baseRate ?? 0,
    roomTypeRates: Object.fromEntries(activeRoomTypes.map((type) => [type.id, type.baseRate])),
    resident: false,
    validFrom: property.systemDate,
    validTo: addDays(property.systemDate, 365),
    sellMode: "Per Room",
    rateMode: "Manual",
    refundable: true,
    cancellationPolicy: "Free cancellation until 24 hours before check-in.",
    active: true,
    locked: false,
    isCustom: true,
    createdAt: now,
    updatedAt: now
  });
  const [error, setError] = useState("");
  const editingLocked = mode === "edit" && Boolean(ratePlan?.locked) && form.locked;

  function update<K extends keyof RatePlan>(key: K, value: RatePlan[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRoomTypeRate(roomTypeId: string, value: number) {
    setForm((current) => ({
      ...current,
      roomTypeRates: { ...current.roomTypeRates, [roomTypeId]: value }
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) { setError("Rate plan name is required."); return; }
    if (ratePlans.some((plan) => plan.id !== form.id && plan.name.toLowerCase() === name.toLowerCase())) {
      setError("A rate plan with this name already exists.");
      return;
    }
    if (form.validTo < form.validFrom) { setError("End date must be on or after the start date."); return; }
    if (activeRoomTypes.some((type) => Number(form.roomTypeRates[type.id]) < 0)) {
      setError("Room-type rates cannot be negative.");
      return;
    }
    if (!form.cancellationPolicy.trim()) { setError("Cancellation policy is required."); return; }

    onSave({
      ...form,
      propertyId,
      name,
      baseRate: Number(form.baseRate) || 0,
      roomTypeRates: Object.fromEntries(activeRoomTypes.map((type) => [
        type.id,
        Number.isFinite(Number(form.roomTypeRates[type.id])) ? Number(form.roomTypeRates[type.id]) : Number(type.baseRate) || 0
      ])),
      sellMode: "Per Room",
      rateMode: "Manual",
      cancellationPolicy: form.cancellationPolicy.trim(),
      updatedAt: new Date().toISOString()
    });
  }

  return (
    <Drawer
      title={mode === "create" ? "Create Rate Plan" : "Edit Rate Plan"}
      subtitle="One plan can contain a different nightly price for every active room type."
      onClose={onClose}
      width="max-w-4xl"
    >
      <form onSubmit={submit} className="space-y-6">
        {error ? <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {editingLocked ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">This plan is locked. Clear “Lock rate editing” below before changing its values.</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Rate Plan Name">
            <TextInput disabled={editingLocked} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Example: Standard Room Only" />
          </Field>
          <Field label="Rate Code">
            <SelectInput disabled={editingLocked} value={form.code} onChange={(event) => update("code", event.target.value)}>
              {rateCodeOptions.filter((item) => item !== "All Rate Codes").map((code) => <option key={code}>{code}</option>)}
            </SelectInput>
          </Field>
          <Field label="Meal Plan">
            <SelectInput disabled={editingLocked} value={form.mealPlan} onChange={(event) => update("mealPlan", event.target.value)}>
              {mealPlanOptions.map((mealPlan) => <option key={mealPlan}>{mealPlan}</option>)}
            </SelectInput>
          </Field>
          <Field label="Currency">
            <SelectInput disabled={editingLocked} value={form.currency} onChange={(event) => update("currency", event.target.value)}>
              {currencyOptions.filter((item) => item !== "All Currencies").map((currency) => <option key={currency}>{currency}</option>)}
            </SelectInput>
          </Field>
        </div>

        <section className="rounded-lg border border-line bg-slate-50 p-5">
          <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 text-slate-500" />Validity period</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Start date"><TextInput disabled={editingLocked} type="date" value={form.validFrom} onChange={(event) => update("validFrom", event.target.value)} /></Field>
            <Field label="End date"><TextInput disabled={editingLocked} type="date" value={form.validTo} onChange={(event) => update("validTo", event.target.value)} /></Field>
          </div>
        </section>

        <section className="rounded-lg border border-line p-5">
          <div className="mb-4">
            <h3 className="font-semibold">Room-type nightly prices</h3>
            <p className="mt-1 text-sm text-slate-500">These are the prices Reservations and Front Desk will use when this plan is selected.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {activeRoomTypes.map((type) => (
              <Field key={type.id} label={type.name}>
                <div className="flex items-center gap-2">
                  <TextInput disabled={editingLocked} type="number" min={0} value={form.roomTypeRates[type.id] ?? type.baseRate} onChange={(event) => updateRoomTypeRate(type.id, Number(event.target.value))} />
                  <span className="text-sm font-semibold text-slate-500">{form.currency}</span>
                </div>
              </Field>
            ))}
          </div>
          {!activeRoomTypes.length ? <p className="text-sm text-rose-600">Create an active room type before creating a rate plan.</p> : null}
        </section>

        <section className="space-y-4 rounded-lg border border-line p-5">
          <h3 className="font-semibold">Terms and availability</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-semibold"><input disabled={editingLocked} type="checkbox" checked={form.resident} onChange={(event) => update("resident", event.target.checked)} />Resident rate</label>
            <label className="flex items-center gap-3 text-sm font-semibold"><input disabled={editingLocked} type="checkbox" checked={form.refundable} onChange={(event) => update("refundable", event.target.checked)} />Refundable</label>
            <label className="flex items-center gap-3 text-sm font-semibold"><input disabled={editingLocked} type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} />Active and selectable</label>
            <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.locked} onChange={(event) => update("locked", event.target.checked)} />Lock rate editing</label>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Cancellation policy</span>
            <textarea disabled={editingLocked} value={form.cancellationPolicy} onChange={(event) => update("cancellationPolicy", event.target.value)} className="min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100" />
          </label>
          <p className="text-xs text-slate-500">Pricing currently uses Manual / Per Room mode. Unsupported automatic and per-person options were removed.</p>
        </section>

        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <ToolbarButton type="button" onClick={onClose}>Cancel</ToolbarButton>
          <ToolbarButton type="submit" tone="dark" disabled={!activeRoomTypes.length}>Save Rate Plan</ToolbarButton>
        </div>
      </form>
    </Drawer>
  );
}
