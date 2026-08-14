"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { property } from "@/app/data/pms-data";
import { currencyOptions, mealPlanOptions } from "../constants";
import type { RatePlan, RoomTypeRecord } from "../types";
import { addDays } from "../utils";
import { Drawer, Field, SelectInput, TextInput, ToolbarButton } from "./rooms-rates-ui";
import { getMealAllocations, getPropertyApiErrorMessage } from "@/app/lib/property-api";
import type { MealAllocation } from "../../settings/property/property-types";
import { getDefaultRateSuggestions, getRatesApiErrorMessage } from "@/app/lib/rates-api";

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
  onSave: (plan: RatePlan) => Promise<void>;
}) {
  const activeRoomTypes = roomTypes.filter((type) => type.active);
  const now = new Date().toISOString();
  const [form, setForm] = useState<RatePlan>(() => ratePlan ?? {
    id: "",
    propertyId,
    name: "",
    code: "",
    currency: property.currency,
    mealPlan: "Room Only",
    mealAllocationId: "",
    baseRate: 0,
    roomTypeRates: {},
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
  const [saving, setSaving] = useState(false);
  const [mealAllocations, setMealAllocations] = useState<MealAllocation[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(mode === "create");
  const editingLocked = mode === "edit" && Boolean(ratePlan?.locked) && form.locked;
  const matchingAllocations = useMemo(() => mealAllocations.filter((allocation) =>
    allocation.active &&
    allocation.mealPlan === form.mealPlan &&
    allocation.currency === form.currency
  ), [form.currency, form.mealPlan, mealAllocations]);

  useEffect(() => {
    let cancelled = false;
    setAllocationsLoading(true);
    void getMealAllocations(propertyId).then((items) => {
      if (!cancelled) setMealAllocations(items);
    }).catch((loadError) => {
      if (!cancelled) setError(getPropertyApiErrorMessage(loadError));
    }).finally(() => {
      if (!cancelled) setAllocationsLoading(false);
    });
    return () => { cancelled = true; };
  }, [propertyId]);

  useEffect(() => {
    if (mode !== "create") return;
    let cancelled = false;
    setSuggestionsLoading(true);
    void getDefaultRateSuggestions(propertyId).then((suggestions) => {
      if (cancelled) return;
      const suggestionByRoomType = new Map(
        suggestions.map((suggestion) => [suggestion.roomTypeId, suggestion.suggestedAmount])
      );
      const roomTypeRates = Object.fromEntries(activeRoomTypes.flatMap((type) => {
        const suggestion = suggestionByRoomType.get(type.id);
        return Number.isFinite(suggestion) ? [[type.id, suggestion as number]] : [];
      }));
      setForm((current) => ({
        ...current,
        baseRate: Object.values(roomTypeRates)[0] ?? 0,
        roomTypeRates
      }));
    }).catch((loadError) => {
      if (!cancelled) setError(getRatesApiErrorMessage(loadError));
    }).finally(() => {
      if (!cancelled) setSuggestionsLoading(false);
    });
    return () => { cancelled = true; };
  }, [mode, propertyId]);

  function update<K extends keyof RatePlan>(key: K, value: RatePlan[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRoomTypeRate(roomTypeId: string, value: number) {
    setForm((current) => ({
      ...current,
      roomTypeRates: { ...current.roomTypeRates, [roomTypeId]: value }
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (!name) { setError("Rate plan name is required."); return; }
    if (!code) { setError("Rate code is required."); return; }
    if (ratePlans.some((plan) => plan.id !== form.id && plan.name.toLowerCase() === name.toLowerCase())) {
      setError("A rate plan with this name already exists.");
      return;
    }
    if (ratePlans.some((plan) => plan.id !== form.id && plan.code.toLowerCase() === code.toLowerCase())) {
      setError("A rate plan with this code already exists.");
      return;
    }
    if (form.validTo < form.validFrom) { setError("End date must be on or after the start date."); return; }
    if (activeRoomTypes.some((type) => !Number.isFinite(form.roomTypeRates[type.id]) || form.roomTypeRates[type.id] < 0)) {
      setError("Enter a non-negative price for every active room type.");
      return;
    }
    if (!form.cancellationPolicy.trim()) { setError("Cancellation policy is required."); return; }
    if (form.mealPlan !== "Room Only" && !form.mealAllocationId) {
      setError("Select a matching meal allocation for this meal-inclusive rate plan.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        propertyId,
        name,
        code,
        baseRate: Number(form.baseRate) || 0,
        roomTypeRates: Object.fromEntries(activeRoomTypes.map((type) => [
          type.id,
          Number(form.roomTypeRates[type.id])
        ])),
        sellMode: "Per Room",
        rateMode: "Manual",
        cancellationPolicy: form.cancellationPolicy.trim(),
        updatedAt: new Date().toISOString()
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Rate plan could not be saved.");
    } finally {
      setSaving(false);
    }
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
            <TextInput disabled={editingLocked} value={form.code} onChange={(event) => update("code", event.target.value.toUpperCase())} placeholder="Example: BAR-BB" />
          </Field>
          <Field label="Meal Plan">
            <SelectInput disabled={editingLocked} value={form.mealPlan} onChange={(event) => setForm((current) => ({ ...current, mealPlan: event.target.value, mealAllocationId: "", mealAllocation: undefined }))}>
              {mealPlanOptions.map((mealPlan) => <option key={mealPlan}>{mealPlan}</option>)}
            </SelectInput>
          </Field>
          <Field label="Currency">
            <SelectInput disabled={editingLocked} value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value, mealAllocationId: "", mealAllocation: undefined }))}>
              {currencyOptions.filter((item) => item !== "All Currencies").map((currency) => <option key={currency}>{currency}</option>)}
            </SelectInput>
          </Field>
          {form.mealPlan !== "Room Only" ? <Field label="Meal Allocation">
            <SelectInput disabled={editingLocked || allocationsLoading} value={form.mealAllocationId} onChange={(event) => update("mealAllocationId", event.target.value)}>
              <option value="">{allocationsLoading ? "Loading allocations..." : "Select allocation"}</option>
              {matchingAllocations.map((allocation) => <option key={allocation.id} value={allocation.id}>{allocation.name} · {allocation.validFrom} to {allocation.validTo}</option>)}
            </SelectInput>
            {!allocationsLoading && !matchingAllocations.length ? <p className="mt-2 text-xs text-amber-700">Create an active {form.mealPlan} allocation in Settings &gt; Property &gt; Meal Allocation using {form.currency}.</p> : null}
          </Field> : null}
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
            {mode === "create" ? <p className="mt-1 text-xs text-slate-500">{suggestionsLoading ? "Loading default room-rate suggestions..." : "Suggested from each room type's Default Room Rate. Review every price before saving."}</p> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {activeRoomTypes.map((type) => (
              <Field key={type.id} label={type.name}>
                <div className="flex items-center gap-2">
                  <TextInput disabled={editingLocked || suggestionsLoading} type="number" min={0} value={form.roomTypeRates[type.id] ?? ""} onChange={(event) => updateRoomTypeRate(type.id, Number(event.target.value))} />
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
          <ToolbarButton type="button" onClick={onClose} disabled={saving}>Cancel</ToolbarButton>
          <ToolbarButton type="submit" tone="dark" disabled={!activeRoomTypes.length || saving || suggestionsLoading}>{saving ? "Saving..." : "Save Rate Plan"}</ToolbarButton>
        </div>
      </form>
    </Drawer>
  );
}
