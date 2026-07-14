"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Edit3, Filter, Plus } from "lucide-react";
import { currencyOptions, rateCodeOptions } from "../constants";
import type { RatePlan, RoomTypeRecord, RoomsRatesModuleProps } from "../types";
import { ratePlanSearch } from "../utils";
import { RatePlanDrawer } from "../components/rate-plan-drawer";
import { Field, Panel, RoomsRatesFrame, SearchInput, SelectInput, StatusPill, ToolbarButton } from "../components/rooms-rates-ui";

type RatesPageProps = RoomsRatesModuleProps & {
  roomTypes: RoomTypeRecord[];
  ratePlans: RatePlan[];
  setRatePlans: Dispatch<SetStateAction<RatePlan[]>>;
};

export function RatesPage({ roomTypes, ratePlans, setRatePlans, setToast }: RatesPageProps) {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currency, setCurrency] = useState("All Currencies");
  const [rateCode, setRateCode] = useState("All Rate Codes");
  const [status, setStatus] = useState("All Statuses");
  const [editingRate, setEditingRate] = useState<RatePlan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filteredPlans = useMemo(
    () =>
      ratePlans.filter((plan) => {
        if (!ratePlanSearch(plan, search)) return false;
        if (currency !== "All Currencies" && plan.currency !== currency) return false;
        if (rateCode !== "All Rate Codes" && plan.code !== rateCode) return false;
        if (status !== "All Statuses" && plan.status !== status) return false;
        return true;
      }),
    [currency, rateCode, ratePlans, search, status]
  );

  function saveRate(plan: RatePlan) {
    setRatePlans((current) => (current.some((item) => item.id === plan.id) ? current.map((item) => (item.id === plan.id ? plan : item)) : [plan, ...current]));
    setEditingRate(null);
    setCreateOpen(false);
    setToast(`${plan.title} saved`);
  }

  function toggleRateStatus(plan: RatePlan) {
    setRatePlans((current) => current.map((item) => (item.id === plan.id ? { ...item, status: item.status === "Active" ? "Disabled" : "Active" } : item)));
    setToast(`${plan.title} ${plan.status === "Active" ? "disabled" : "enabled"}`);
  }

  return (
    <RoomsRatesFrame>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Rates</h1>
        <ToolbarButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          Add Rate
        </ToolbarButton>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." />
        <ToolbarButton icon={<Filter className="h-4 w-4" />} onClick={() => setFiltersOpen((current) => !current)}>
          Filter
        </ToolbarButton>
      </div>

      {filtersOpen ? (
        <Panel>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Currency">
              <SelectInput value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {currencyOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Rate Code">
              <SelectInput value={rateCode} onChange={(event) => setRateCode(event.target.value)}>
                {rateCodeOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={status} onChange={(event) => setStatus(event.target.value)}>
                <option>All Statuses</option>
                <option>Active</option>
                <option>Disabled</option>
              </SelectInput>
            </Field>
          </div>
        </Panel>
      ) : null}

      <Panel title="Rates">
        <div className="space-y-10">
          {roomTypes.map((roomType) => {
            const plans = filteredPlans.filter((plan) => plan.roomType === roomType.name);
            if (!plans.length) return null;
            return (
              <section key={roomType.id}>
                <h2 className="mb-3 text-xl font-semibold">{roomType.name}</h2>
                <div className="overflow-x-auto border-t border-line">
                  <table className="min-w-[1100px] w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr className="border-b border-line">
                        {["Type", "Rate Plan Title", "Currency", "Sell Mode", "Rate Mode", "Status", "Actions"].map((heading) => (
                          <th key={heading} className="px-4 py-4 font-semibold">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((plan) => (
                        <tr key={plan.id} className="border-b border-line">
                          <td className="px-4 py-5 font-medium">{plan.code}</td>
                          <td className="px-4 py-5">{plan.title}</td>
                          <td className="px-4 py-5">{plan.currency}</td>
                          <td className="px-4 py-5">{plan.sellMode}</td>
                          <td className="px-4 py-5">{plan.rateMode}</td>
                          <td className="px-4 py-5">
                            <StatusPill active={plan.status === "Active"}>{plan.status}</StatusPill>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3">
                              <button type="button" title="Edit rate" onClick={() => setEditingRate(plan)} className="text-slate-700 hover:text-slate-950">
                                <Edit3 className="h-5 w-5" />
                              </button>
                              <ToolbarButton onClick={() => toggleRateStatus(plan)}>
                                {plan.status === "Active" ? "Disable" : "Enable"}
                              </ToolbarButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </Panel>

      {createOpen ? <RatePlanDrawer mode="create" ratePlan={null} roomTypes={roomTypes} onClose={() => setCreateOpen(false)} onSave={saveRate} /> : null}
      {editingRate ? <RatePlanDrawer mode="edit" ratePlan={editingRate} roomTypes={roomTypes} onClose={() => setEditingRate(null)} onSave={saveRate} /> : null}
    </RoomsRatesFrame>
  );
}
