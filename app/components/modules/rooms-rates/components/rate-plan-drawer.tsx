"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { currencyOptions, mealPlanOptions, rateCodeOptions, roomRatesSystemDate } from "../constants";
import type { RatePlan, RoomTypeRecord } from "../types";
import { addDays, buildRateTitle } from "../utils";
import { Drawer, Field, SelectInput, TextInput, ToolbarButton } from "./rooms-rates-ui";

export function RatePlanDrawer({
  mode,
  ratePlan,
  roomTypes,
  onClose,
  onSave
}: {
  mode: "create" | "edit";
  ratePlan: RatePlan | null;
  roomTypes: RoomTypeRecord[];
  onClose: () => void;
  onSave: (plan: RatePlan) => void;
}) {
  const [form, setForm] = useState<RatePlan>(
    ratePlan ?? {
      id: `rate-${Date.now()}`,
      code: "FIT",
      roomType: roomTypes[0]?.name ?? "Deluxe Double Room",
      mealPlan: "Room Only",
      currency: "LKR",
      resident: false,
      title: "",
      validFrom: roomRatesSystemDate,
      validTo: addDays(roomRatesSystemDate, 30),
      sellMode: "Per Room",
      rateMode: "Manual",
      defaultRate: roomTypes[0]?.baseRate ?? 6500,
      status: "Active",
      locked: false
    }
  );

  const generatedTitle = useMemo(() => buildRateTitle(form), [form]);
  const title = form.title || generatedTitle;

  function update<K extends keyof RatePlan>(key: K, value: RatePlan[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (["code", "roomType", "mealPlan", "currency", "resident"].includes(String(key)) && !current.title) {
        return { ...next, title: "" };
      }
      return next;
    });
  }

  function setPeriod(days: number) {
    update("validFrom", roomRatesSystemDate);
    update("validTo", addDays(roomRatesSystemDate, days));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      ...form,
      title,
      defaultRate: Number(form.defaultRate) || 0
    });
  }

  return (
    <Drawer
      title={mode === "create" ? "Create Rate" : "Edit Rate Plan"}
      subtitle={mode === "create" ? "Enter the details for the new rate" : "Update the details for this rate plan"}
      onClose={onClose}
      width="max-w-3xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Rate Code - Select the correct rate plan">
          <SelectInput value={form.code} onChange={(event) => update("code", event.target.value)}>
            {rateCodeOptions.filter((item) => item !== "All Rate Codes").map((code) => (
              <option key={code}>{code}</option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Room Type">
          <SelectInput value={form.roomType} onChange={(event) => update("roomType", event.target.value)}>
            {roomTypes.map((type) => (
              <option key={type.id}>{type.name}</option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Meal Plan">
          <SelectInput value={form.mealPlan} onChange={(event) => update("mealPlan", event.target.value)}>
            {mealPlanOptions.map((mealPlan) => (
              <option key={mealPlan}>{mealPlan}</option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Currency">
          <SelectInput value={form.currency} onChange={(event) => update("currency", event.target.value)}>
            {currencyOptions.filter((item) => item !== "All Currencies").map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </SelectInput>
        </Field>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={form.resident} onChange={(event) => update("resident", event.target.checked)} className="h-4 w-4 accent-slate-950" />
          Resident
        </label>

        <Field label="Rate Plan Title (Auto-generated, can be customized)">
          <TextInput value={title} onChange={(event) => update("title", event.target.value)} placeholder="Resident - Rate Code - Room Type - Meal Plan - Currency" />
          <p className="mt-2 text-sm font-semibold text-emerald-600">Title is available</p>
        </Field>

        <section className="rounded-lg border border-line bg-slate-50 p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <CalendarDays className="h-5 w-5 text-slate-500" />
            Period
          </h3>
          <p className="mt-1 text-sm text-slate-500">Set the start and end dates for this rate plan</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[30, 90, 180].map((days) => (
              <button key={days} type="button" onClick={() => setPeriod(days)} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold">
                Next {days} days
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Start date">
              <TextInput type="date" value={form.validFrom} onChange={(event) => update("validFrom", event.target.value)} />
            </Field>
            <Field label="End date">
              <TextInput type="date" value={form.validTo} onChange={(event) => update("validTo", event.target.value)} />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Price Setting</h3>
          <p className="mb-2 text-sm font-semibold">Sell Mode</p>
          <div className="mb-4 flex gap-2">
            {(["Per Room", "Per Person"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => update("sellMode", item)}
                className={`rounded-md border px-5 py-3 text-sm font-semibold ${form.sellMode === item ? "border-slate-950 bg-slate-950 text-white" : "border-line bg-white"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="mb-2 text-sm font-semibold">Rate Mode</p>
          <div className="mb-4 flex gap-2">
            {(["Manual", "Auto"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => update("rateMode", item)}
                className={`rounded-md border px-5 py-3 text-sm font-semibold ${form.rateMode === item ? "border-slate-950 bg-slate-950 text-white" : "border-line bg-white"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <Field label="Default Rate">
            <TextInput type="number" min={0} value={form.defaultRate} onChange={(event) => update("defaultRate", Number(event.target.value))} />
            <p className="mt-2 text-sm font-semibold text-slate-500">{form.currency}</p>
          </Field>
          <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={form.locked} onChange={(event) => update("locked", event.target.checked)} className="h-4 w-4 accent-slate-950" />
            Lock editing at UI
          </label>
        </section>

        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <ToolbarButton type="button" onClick={onClose}>Cancel</ToolbarButton>
          <ToolbarButton type="submit" tone="dark">Save</ToolbarButton>
        </div>
      </form>
    </Drawer>
  );
}
