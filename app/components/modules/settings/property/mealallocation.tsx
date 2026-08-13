"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  createMealAllocation,
  getMealAllocations,
  getPropertyApiErrorMessage,
  retireMealAllocation,
  updateMealAllocation
} from "@/app/lib/property-api";
import type { MealAllocation, MealAmounts, MealPlan } from "./property-types";

const mealPlans: MealPlan[] = ["Room Only", "Bed & Breakfast", "Half Board", "Full Board", "All Inclusive"];
const zeroMeals: MealAmounts = { breakfast: 0, lunch: 0, dinner: 0 };

function initialForm(currency: string): MealAllocation {
  const today = new Date();
  const nextYear = new Date(today);
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  return {
    id: "",
    name: "",
    mealPlan: "Bed & Breakfast",
    currency,
    adultAmounts: { ...zeroMeals },
    childAmounts: { ...zeroMeals },
    validFrom: dateKey(today),
    validTo: dateKey(nextYear),
    active: true,
    notes: "",
    version: 0
  };
}

export function MealAllocationTab({
  propertyId,
  propertyExists,
  homeCurrency,
  setToast
}: {
  propertyId: string;
  propertyExists: boolean;
  homeCurrency: string;
  setToast: (message: string) => void;
}) {
  const [allocations, setAllocations] = useState<MealAllocation[]>([]);
  const [form, setForm] = useState<MealAllocation>(() => initialForm(homeCurrency));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!propertyExists) {
      setAllocations([]);
      return;
    }
    void refresh();
  }, [propertyExists, propertyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setAllocations(await getMealAllocations(propertyId));
    } catch (requestError) {
      setError(getPropertyApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!propertyExists) {
      setError("Save Property Info first so this property exists in MongoDB.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = form.id
        ? await updateMealAllocation(propertyId, form)
        : await createMealAllocation(propertyId, form);
      setAllocations((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current];
      });
      setForm(initialForm(homeCurrency));
      setToast(form.id ? "Meal allocation updated in MongoDB" : "Meal allocation created in MongoDB");
    } catch (requestError) {
      setError(getPropertyApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  function edit(item: MealAllocation) {
    setForm({
      ...item,
      adultAmounts: { ...item.adultAmounts },
      childAmounts: { ...item.childAmounts }
    });
    setError("");
  }

  async function retire(item: MealAllocation) {
    if (!window.confirm(`Retire ${item.name}? Existing booking history will be kept.`)) return;
    setSaving(true);
    setError("");
    try {
      const retired = await retireMealAllocation(propertyId, item.id);
      setAllocations((current) => current.map((row) => row.id === retired.id ? retired : row));
      if (form.id === retired.id) setForm(initialForm(homeCurrency));
      setToast("Meal allocation retired in MongoDB");
    } catch (requestError) {
      setError(getPropertyApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  function changePlan(mealPlan: MealPlan) {
    const allowed = allowedMeals(mealPlan);
    const clearUnsupported = (amounts: MealAmounts): MealAmounts => ({
      breakfast: allowed.has("breakfast") ? amounts.breakfast : 0,
      lunch: allowed.has("lunch") ? amounts.lunch : 0,
      dinner: allowed.has("dinner") ? amounts.dinner : 0
    });
    setForm((current) => ({
      ...current,
      mealPlan,
      adultAmounts: clearUnsupported(current.adultAmounts),
      childAmounts: clearUnsupported(current.childAmounts)
    }));
  }

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Meal Allocation</h2><p className="mt-1 text-sm text-slate-500">Split an inclusive nightly rate into meal values for reporting. These values do not add another charge to the guest.</p></div>
      <button type="button" onClick={() => void refresh()} disabled={!propertyExists || loading} className="h-10 rounded-md border border-line px-4 font-semibold disabled:opacity-50">{loading ? "Refreshing..." : "Refresh"}</button>
    </div>
    {error ? <div className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}
    <div className="mt-6 grid gap-6 xl:grid-cols-[560px_1fr]">
      <form onSubmit={submit} className="rounded-lg border border-line p-6">
        <h3 className="text-lg font-semibold">{form.id ? "Edit Allocation" : "Create Allocation"}</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Allocation name"><input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Standard B&B Allocation" className={inputClass} /></Field>
          <Field label="Meal plan"><select value={form.mealPlan} onChange={(event) => changePlan(event.target.value as MealPlan)} className={inputClass}>{mealPlans.map((plan) => <option key={plan}>{plan}</option>)}</select></Field>
          <Field label="Valid from"><input required type="date" value={form.validFrom} onChange={(event) => setForm({ ...form, validFrom: event.target.value })} className={inputClass} /></Field>
          <Field label="Valid to"><input required type="date" value={form.validTo} min={form.validFrom} onChange={(event) => setForm({ ...form, validTo: event.target.value })} className={inputClass} /></Field>
          <Field label="Currency"><select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} className={inputClass}>{[homeCurrency, "LKR", "USD", "EUR", "GBP"].filter((value, index, all) => all.indexOf(value) === index).map((currency) => <option key={currency}>{currency}</option>)}</select></Field>
          <label className="flex h-12 items-center gap-3 self-end font-semibold"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-5 w-5 accent-ink" />Active and selectable</label>
        </div>
        <AmountGroup label="Adult allocation per person / night" mealPlan={form.mealPlan} amounts={form.adultAmounts} onChange={(adultAmounts) => setForm({ ...form, adultAmounts })} />
        <AmountGroup label="Child allocation per person / night" mealPlan={form.mealPlan} amounts={form.childAmounts} onChange={(childAmounts) => setForm({ ...form, childAmounts })} />
        <Field label="Notes"><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} maxLength={1000} rows={3} placeholder="Internal allocation notes" className="w-full rounded-md border border-line p-3" /></Field>
        <div className="mt-5 flex gap-3"><button disabled={saving || !propertyExists} className="h-11 rounded-md bg-ink px-5 font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : form.id ? "Save Allocation" : "Create Allocation"}</button>{form.id ? <button type="button" onClick={() => setForm(initialForm(homeCurrency))} className="h-11 rounded-md border border-line px-5 font-semibold">Cancel</button> : null}</div>
      </form>
      <section className="rounded-lg border border-line p-6">
        <h3 className="mb-4 text-lg font-semibold">Existing Allocations</h3>
        {loading ? <p className="text-slate-500">Loading allocations from MongoDB...</p> : allocations.length ? <div className="space-y-3">{allocations.map((item) => <article key={item.id} className={`rounded-lg border border-line p-4 ${item.active ? "" : "opacity-60"}`}>
          <div className="flex flex-wrap justify-between gap-3"><div><h4 className="font-semibold">{item.name}</h4><p className="text-sm text-slate-500">{item.mealPlan} · {item.currency} · {item.validFrom} to {item.validTo}</p></div><span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${item.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{item.active ? "Active" : "Retired"}</span></div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm"><MealSummary label="Breakfast" adult={item.adultAmounts.breakfast} child={item.childAmounts.breakfast} /><MealSummary label="Lunch" adult={item.adultAmounts.lunch} child={item.childAmounts.lunch} /><MealSummary label="Dinner" adult={item.adultAmounts.dinner} child={item.childAmounts.dinner} /></div>
          <div className="mt-4 flex gap-2"><button type="button" onClick={() => edit(item)} className="rounded-md border border-line px-3 py-2 font-semibold">Edit</button>{item.active ? <button type="button" disabled={saving} onClick={() => void retire(item)} className="rounded-md border border-rose-300 px-3 py-2 font-semibold text-rose-700">Retire</button> : null}</div>
        </article>)}</div> : <p className="text-slate-500">No MongoDB meal allocations yet.</p>}
      </section>
    </div>
  </div>;
}

const inputClass = "h-12 w-full rounded-md border border-line bg-white px-3";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block font-semibold">{label}</span>{children}</label>;
}

function AmountGroup({ label, mealPlan, amounts, onChange }: { label: string; mealPlan: MealPlan; amounts: MealAmounts; onChange: (amounts: MealAmounts) => void }) {
  const allowed = allowedMeals(mealPlan);
  return <fieldset className="my-5 rounded-md border border-line p-4"><legend className="px-2 font-semibold">{label}</legend><div className="grid grid-cols-3 gap-3">{(["breakfast", "lunch", "dinner"] as const).map((meal) => <Field key={meal} label={capitalize(meal)}><input type="number" min="0" step="0.01" disabled={!allowed.has(meal)} value={amounts[meal]} onChange={(event) => onChange({ ...amounts, [meal]: Number(event.target.value) })} className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`} /></Field>)}</div></fieldset>;
}

function MealSummary({ label, adult, child }: { label: string; adult: number; child: number }) {
  return <div className="rounded-md bg-slate-50 p-2"><b>{label}</b><span className="block text-xs text-slate-500">Adult {adult.toLocaleString()} · Child {child.toLocaleString()}</span></div>;
}

function allowedMeals(plan: MealPlan) {
  if (plan === "Bed & Breakfast") return new Set(["breakfast"]);
  if (plan === "Half Board") return new Set(["breakfast", "dinner"]);
  if (plan === "Full Board" || plan === "All Inclusive") return new Set(["breakfast", "lunch", "dinner"]);
  return new Set<string>();
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
