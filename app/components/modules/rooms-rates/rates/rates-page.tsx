"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Edit3, Filter, Plus, RefreshCw } from "lucide-react";
import { getPlanRate } from "../../front-desk/rate-plans";
import { currencyOptions } from "../constants";
import { createRatePlanRecord, getRatesApiErrorMessage, updateRatePlanRecord } from "@/app/lib/rates-api";
import type { RatePlan, RoomTypeRecord, RoomsRatesModuleProps } from "../types";
import { ratePlanSearch } from "../utils";
import { RatePlanDrawer } from "../components/rate-plan-drawer";
import { Field, Panel, RoomsRatesFrame, SearchInput, SelectInput, StatusPill, ToolbarButton } from "../components/rooms-rates-ui";

type RatesPageProps = RoomsRatesModuleProps & {
  roomTypes: RoomTypeRecord[];
  ratePlans: RatePlan[];
  setRatePlans: Dispatch<SetStateAction<RatePlan[]>>;
  loading: boolean;
  error: string;
  refreshRatePlans: () => Promise<void>;
};

export function RatesPage({ propertyId, roomTypes, ratePlans, setRatePlans, loading, error, refreshRatePlans, setToast }: RatesPageProps) {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currency, setCurrency] = useState("All Currencies");
  const [rateCode, setRateCode] = useState("All Rate Codes");
  const [status, setStatus] = useState("All Statuses");
  const [editingRate, setEditingRate] = useState<RatePlan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const activeRoomTypes = roomTypes.filter((type) => type.active);
  const rateCodes = useMemo(() => ["All Rate Codes", ...Array.from(new Set(ratePlans.map((plan) => plan.code))).sort()], [ratePlans]);

  const filteredPlans = useMemo(
    () => ratePlans.filter((plan) => {
      if (!ratePlanSearch(plan, search)) return false;
      if (currency !== "All Currencies" && plan.currency !== currency) return false;
      if (rateCode !== "All Rate Codes" && plan.code !== rateCode) return false;
      if (status === "Active" && !plan.active) return false;
      if (status === "Disabled" && plan.active) return false;
      return true;
    }),
    [currency, rateCode, ratePlans, search, status]
  );

  async function saveRate(plan: RatePlan) {
    try {
      const original = ratePlans.find((item) => item.id === plan.id);
      let saved: RatePlan;
      if (!original) {
        saved = await createRatePlanRecord(propertyId, plan);
      } else if (original.locked && !plan.locked) {
        await updateRatePlanRecord(propertyId, plan.id, { locked: false });
        saved = await updateRatePlanRecord(propertyId, plan.id, plan);
      } else {
        saved = await updateRatePlanRecord(propertyId, plan.id, plan);
      }
      setRatePlans((current) => current.some((item) => item.id === saved.id)
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]);
      setEditingRate(null);
      setCreateOpen(false);
      setToast(`${saved.name} saved in MongoDB and available to Reservations`);
    } catch (saveError) {
      throw new Error(getRatesApiErrorMessage(saveError));
    }
  }

  async function toggleRateStatus(plan: RatePlan) {
    setTogglingId(plan.id);
    try {
      const saved = await updateRatePlanRecord(propertyId, plan.id, { active: !plan.active });
      setRatePlans((current) => current.map((item) => item.id === saved.id ? saved : item));
      setToast(`${saved.name} ${saved.active ? "enabled" : "disabled"}`);
    } catch (toggleError) {
      setToast(getRatesApiErrorMessage(toggleError));
    } finally {
      setTogglingId("");
    }
  }

  return (
    <RoomsRatesFrame>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rates</h1>
          <p className="mt-1 text-sm text-slate-500">The same plans and prices are used by Inventory, Reservations, and Front Desk.</p>
        </div>
        <div className="flex gap-2">
          <ToolbarButton icon={<RefreshCw className="h-4 w-4" />} onClick={() => void refreshRatePlans()} disabled={loading}>Refresh</ToolbarButton>
          <ToolbarButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)} disabled={loading}>Add Rate Plan</ToolbarButton>
        </div>
      </div>

      {error ? <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {loading ? <div className="rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-500">Loading rate plans from MongoDB...</div> : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plan, code, meal plan or currency..." />
        <ToolbarButton icon={<Filter className="h-4 w-4" />} onClick={() => setFiltersOpen((current) => !current)}>Filter</ToolbarButton>
      </div>

      {filtersOpen ? (
        <Panel><div className="grid gap-4 md:grid-cols-3">
          <Field label="Currency"><SelectInput value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencyOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
          <Field label="Rate Code"><SelectInput value={rateCode} onChange={(event) => setRateCode(event.target.value)}>{rateCodes.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
          <Field label="Status"><SelectInput value={status} onChange={(event) => setStatus(event.target.value)}><option>All Statuses</option><option>Active</option><option>Disabled</option></SelectInput></Field>
        </div></Panel>
      ) : null}

      <Panel title="Room-type Rates" subtitle={`${activeRoomTypes.length} active room types · ${filteredPlans.length} matching plans`}>
        <div className="space-y-10">
          {activeRoomTypes.map((roomType) => (
            <section key={roomType.id}>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div><h2 className="text-xl font-semibold">{roomType.name}</h2><p className="text-sm text-slate-500">Base room-type rate: {roomType.baseRate.toLocaleString()}</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{roomType.rooms.length} physical rooms</span>
              </div>
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full min-w-[1250px] text-left text-sm">
                  <thead className="text-slate-500"><tr className="border-b border-line">
                    {["Code", "Rate Plan", "Meal Plan", "Currency", "Nightly Rate", "Valid Period", "Terms", "Status", "Actions"].map((heading) => <th key={heading} className="px-4 py-4 font-semibold">{heading}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredPlans.map((plan) => (
                      <tr key={`${roomType.id}-${plan.id}`} className="border-b border-line">
                        <td className="px-4 py-4 font-medium">{plan.code}{plan.resident ? " Resident" : ""}</td>
                        <td className="px-4 py-4 font-semibold">{plan.name}{plan.locked ? <span className="ml-2 text-xs text-amber-600">Locked</span> : null}</td>
                        <td className="px-4 py-4">{plan.mealPlan}</td>
                        <td className="px-4 py-4">{plan.currency}</td>
                        <td className="px-4 py-4 text-base font-bold">{getPlanRate(plan, roomType.id).toLocaleString()}</td>
                        <td className="px-4 py-4">{plan.validFrom} – {plan.validTo}</td>
                        <td className="px-4 py-4">{plan.refundable ? "Refundable" : "Non-refundable"}</td>
                        <td className="px-4 py-4"><StatusPill active={plan.active}>{plan.active ? "Active" : "Disabled"}</StatusPill></td>
                        <td className="px-4 py-4"><div className="flex items-center gap-3">
                          <button type="button" title="Edit rate plan" onClick={() => setEditingRate(plan)} className="text-slate-700 hover:text-slate-950"><Edit3 className="h-5 w-5" /></button>
                          <ToolbarButton onClick={() => void toggleRateStatus(plan)} disabled={togglingId === plan.id}>{togglingId === plan.id ? "Saving..." : plan.active ? "Disable" : "Enable"}</ToolbarButton>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredPlans.length ? <div className="py-8 text-center text-sm text-slate-500">No rate plans match the current filters.</div> : null}
              </div>
            </section>
          ))}
          {!activeRoomTypes.length ? <div className="py-12 text-center text-sm text-rose-600">Create an active room type before configuring rates.</div> : null}
        </div>
      </Panel>

      {createOpen ? <RatePlanDrawer mode="create" propertyId={propertyId} ratePlan={null} ratePlans={ratePlans} roomTypes={roomTypes} onClose={() => setCreateOpen(false)} onSave={saveRate} /> : null}
      {editingRate ? <RatePlanDrawer mode="edit" propertyId={propertyId} ratePlan={editingRate} ratePlans={ratePlans} roomTypes={roomTypes} onClose={() => setEditingRate(null)} onSave={saveRate} /> : null}
    </RoomsRatesFrame>
  );
}
