"use client";

import type { Dispatch, SetStateAction } from "react";
import { Fragment, FormEvent, useMemo, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { ChevronLeft, ChevronRight, RefreshCw, Save } from "lucide-react";
import { currencyOptions, inventoryStartDate, rateCodeOptions } from "../constants";
import type { InventoryCellMap, RatePlan, RoomTypeRecord, RoomsRatesModuleProps } from "../types";
import { addDays, availabilityFor, buildInventoryCells, dateLabel, makeInventoryKey, weekdayLabel } from "../utils";
import { RatePlanDrawer } from "../components/rate-plan-drawer";
import { Drawer, Field, Panel, RoomsRatesFrame, SelectInput, TextInput, ToolbarButton } from "../components/rooms-rates-ui";
import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { businessBlockStorageKey, isBusinessBlockArray, migrateBusinessBlockRecords } from "@/app/lib/business-block-repository";
import { initialBusinessBlocks } from "../../reservation/constants";
import type { BusinessBlock } from "../../reservation/types";
import { property } from "@/app/data/pms-data";

type InventoryPageProps = RoomsRatesModuleProps & {
  roomTypes: RoomTypeRecord[];
  ratePlans: RatePlan[];
  setRatePlans: Dispatch<SetStateAction<RatePlan[]>>;
};

type InventoryAction = "" | "bulk" | "rules" | "logs" | "settings";
type ActiveInventoryAction = Exclude<InventoryAction, "">;

export function InventoryPage({ propertyId, roomTypes, ratePlans, setRatePlans, reservations, setToast }: InventoryPageProps) {
  const [businessBlocks] = useLocalStorageState<BusinessBlock[]>(businessBlockStorageKey(propertyId), initialBusinessBlocks, isBusinessBlockArray, (records) => migrateBusinessBlockRecords(records, propertyId, property.currency, property.systemDate));
  const [currency, setCurrency] = useState("All Currencies");
  const [rateCode, setRateCode] = useState("All Rate Codes");
  const [option, setOption] = useState("All Inventory");
  const [roomsFilter, setRoomsFilter] = useState("All Rooms");
  const [ratesFilter, setRatesFilter] = useState("All Rates");
  const [startDate, setStartDate] = useState(inventoryStartDate);
  const [gridDays, setGridDays] = useState(12);
  const dates = useMemo(() => Array.from({ length: gridDays }, (_, index) => addDays(startDate, index)), [gridDays, startDate]);
  const inventoryKey = `staypilot:${propertyId}:rooms-rates:inventory`;
  const [savedCells, setSavedCells] = useSessionState<InventoryCellMap>(`${inventoryKey}:saved-cells`, () => buildInventoryCells(ratePlans, dates));
  const [cells, setCells] = useSessionState<InventoryCellMap>(`${inventoryKey}:draft-cells`, () => buildInventoryCells(ratePlans, dates));
  const [createOpen, setCreateOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<InventoryAction>("");
  const dirty = JSON.stringify(cells) !== JSON.stringify(savedCells);

  const filteredRoomTypes = useMemo(() => roomTypes.filter((type) => roomsFilter === "All Rooms" || type.name === roomsFilter), [roomTypes, roomsFilter]);
  const filteredPlans = useMemo(
    () =>
      ratePlans.filter((plan) => {
        if (currency !== "All Currencies" && plan.currency !== currency) return false;
        if (rateCode !== "All Rate Codes" && plan.code !== rateCode) return false;
        if (ratesFilter !== "All Rates" && plan.status !== ratesFilter) return false;
        if (option === "Locked Only" && !plan.locked) return false;
        return true;
      }),
    [currency, option, rateCode, ratePlans, ratesFilter]
  );

  function setCellValue(planId: string, date: string, value: number) {
    setCells((current) => ({ ...current, [makeInventoryKey(planId, date)]: value }));
  }

  function currentCellValue(plan: RatePlan, date: string) {
    const key = makeInventoryKey(plan.id, date);
    return cells[key] ?? plan.defaultRate;
  }

  function saveRate(plan: RatePlan) {
    setRatePlans((current) => (current.some((item) => item.id === plan.id) ? current.map((item) => (item.id === plan.id ? plan : item)) : [plan, ...current]));
    setCells((current) => {
      const next = { ...current };
      dates.forEach((date) => {
        next[makeInventoryKey(plan.id, date)] = plan.defaultRate;
      });
      return next;
    });
    setSavedCells((current) => {
      const next = { ...current };
      dates.forEach((date) => {
        next[makeInventoryKey(plan.id, date)] = plan.defaultRate;
      });
      return next;
    });
    setCreateOpen(false);
    setToast("Rate created for inventory");
  }

  function saveChanges() {
    setSavedCells(cells);
    setToast("Inventory changes saved");
  }

  function resetChanges() {
    setCells(savedCells);
    setToast("Inventory changes reset");
  }

  function applyBulkRate(value: number) {
    const visiblePlanIds = new Set(filteredPlans.map((plan) => plan.id));
    setCells((current) => {
      const next = { ...current };
      ratePlans.forEach((plan) => {
        if (!visiblePlanIds.has(plan.id) || plan.locked) return;
        dates.forEach((date) => {
          next[makeInventoryKey(plan.id, date)] = value;
        });
      });
      return next;
    });
    setActiveAction("");
    setToast("Bulk inventory rate applied");
  }

  return (
    <RoomsRatesFrame>
      <div className="grid gap-3 xl:grid-cols-[180px_220px_200px_1fr_200px_200px_auto_auto_auto]">
        <SelectInput value={currency} onChange={(event) => setCurrency(event.target.value)}>
          {currencyOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </SelectInput>
        <SelectInput value={rateCode} onChange={(event) => setRateCode(event.target.value)}>
          {rateCodeOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </SelectInput>
        <SelectInput value={option} onChange={(event) => setOption(event.target.value)}>
          <option>All Inventory</option>
          <option>Locked Only</option>
          <option>Changed Cells</option>
        </SelectInput>
        <div />
        <SelectInput value={roomsFilter} onChange={(event) => setRoomsFilter(event.target.value)}>
          <option>All Rooms</option>
          {roomTypes.map((type) => (
            <option key={type.id}>{type.name}</option>
          ))}
        </SelectInput>
        <SelectInput value={ratesFilter} onChange={(event) => setRatesFilter(event.target.value)}>
          <option>All Rates</option>
          <option>Active</option>
          <option>Disabled</option>
        </SelectInput>
        <ToolbarButton tone="dark" icon={<Save className="h-4 w-4" />} onClick={saveChanges} disabled={!dirty}>
          Save Changes
        </ToolbarButton>
        <ToolbarButton icon={<RefreshCw className="h-4 w-4" />} onClick={resetChanges} disabled={!dirty}>
          Reset Changes
        </ToolbarButton>
        <ToolbarButton tone="dark" onClick={() => setCreateOpen(true)}>
          Add Rate
        </ToolbarButton>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <SelectInput value={activeAction} onChange={(event) => setActiveAction(event.target.value as InventoryAction)} className="w-44">
          <option value="">Actions</option>
          <option value="bulk">Bulk Update</option>
          <option value="rules">Availability Rules</option>
          <option value="logs">Show Logs</option>
          <option value="settings">Settings</option>
        </SelectInput>
      </div>

      <Panel
        title="Rate and Availability"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton onClick={() => setStartDate(addDays(startDate, -gridDays))}>
              <ChevronLeft className="h-4 w-4" />
            </ToolbarButton>
            <div className="rounded-md border border-line px-4 py-3 text-sm font-semibold">
              {dateLabel(startDate)} 2026 - {dateLabel(addDays(startDate, gridDays - 1))} 2026
            </div>
            <ToolbarButton onClick={() => setStartDate(addDays(startDate, gridDays))}>
              <ChevronRight className="h-4 w-4" />
            </ToolbarButton>
            <span className="text-sm font-semibold">Grid Days:</span>
            <TextInput
              type="number"
              min={5}
              max={31}
              value={gridDays}
              onChange={(event) => setGridDays(Math.max(5, Math.min(31, Number(event.target.value) || 12)))}
              className="w-24"
            />
          </div>
        }
        bodyClassName="p-5"
      >
        <div className="overflow-auto">
          <table className="min-w-[1280px] w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border border-line bg-white px-3 py-4 text-left font-semibold text-slate-600">Room Type</th>
                {dates.map((date) => {
                  const day = new Date(`${date}T00:00:00`).getDay();
                  const isWeekend = day === 0 || day === 6;
                  const isFirst = date === startDate;
                  return (
                    <th key={date} className={`border border-line px-4 py-3 text-center ${isFirst ? "bg-emerald-100" : isWeekend ? "bg-rose-100 text-rose-700" : "bg-white"}`}>
                      <span className="block text-xs text-slate-500">{weekdayLabel(date)}</span>
                      <span className="block font-semibold">{dateLabel(date)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredRoomTypes.map((roomType) => {
                const plans = filteredPlans.filter((plan) => plan.roomType === roomType.name);
                if (!plans.length) return null;
                return (
                  <Fragment key={roomType.id}>
                    <tr key={`${roomType.id}-availability`} className="bg-blue-50">
                      <td className="sticky left-0 z-10 border border-line bg-blue-50 px-3 py-3">
                        <p className="font-semibold">{roomType.name}</p>
                        <p className="text-xs text-slate-500">AVL</p>
                      </td>
                      {dates.map((date) => (
                        <td key={date} className="border border-line px-3 py-3 text-center text-lg font-bold">
                          {availabilityFor(roomType, date, reservations, businessBlocks)}
                        </td>
                      ))}
                    </tr>
                    {plans.map((plan) => (
                      <tr key={plan.id}>
                        <td className="sticky left-0 z-10 border border-line bg-white px-3 py-3">
                          <p className="font-semibold text-slate-600">{plan.title}</p>
                          <p className="text-xs text-slate-500">RO ({plan.currency}) - {plan.sellMode === "Per Person" ? "2" : "1"} - {plan.code}</p>
                        </td>
                        {dates.map((date) => (
                          <td key={date} className="border border-line px-2 py-2 text-center">
                            <input
                              type="number"
                              value={currentCellValue(plan, date)}
                              disabled={plan.locked || plan.status === "Disabled"}
                              onChange={(event) => setCellValue(plan.id, date, Number(event.target.value))}
                              className="h-10 w-24 rounded-md border border-transparent bg-transparent text-center outline-none focus:border-slate-300 focus:bg-white disabled:text-slate-400"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {createOpen ? <RatePlanDrawer mode="create" ratePlan={null} roomTypes={roomTypes} onClose={() => setCreateOpen(false)} onSave={saveRate} /> : null}
      {activeAction ? (
        <InventoryActionDrawer
          action={activeAction}
          onClose={() => setActiveAction("")}
          onBulkApply={applyBulkRate}
          changedCount={Object.keys(cells).filter((key) => cells[key] !== savedCells[key]).length}
        />
      ) : null}
    </RoomsRatesFrame>
  );
}

function InventoryActionDrawer({
  action,
  onClose,
  onBulkApply,
  changedCount
}: {
  action: ActiveInventoryAction;
  onClose: () => void;
  onBulkApply: (value: number) => void;
  changedCount: number;
}) {
  const [bulkValue, setBulkValue] = useState(6500);

  const titles: Record<ActiveInventoryAction, string> = {
    bulk: "Bulk Update",
    rules: "Availability Rules",
    logs: "Inventory Logs",
    settings: "Inventory Settings"
  };

  return (
    <Drawer title={titles[action]} onClose={onClose} width="max-w-xl">
      {action === "bulk" ? (
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onBulkApply(bulkValue);
          }}
          className="space-y-4"
        >
          <Field label="New rate value">
            <TextInput type="number" min={0} value={bulkValue} onChange={(event) => setBulkValue(Number(event.target.value))} />
          </Field>
          <p className="text-sm text-slate-500">Applies to all visible, unlocked cells in the current grid.</p>
          <div className="flex justify-end gap-2">
            <ToolbarButton type="button" onClick={onClose}>Cancel</ToolbarButton>
            <ToolbarButton type="submit" tone="dark">Apply bulk update</ToolbarButton>
          </div>
        </form>
      ) : null}

      {action === "rules" ? (
        <div className="space-y-4">
          <label className="flex items-center gap-3 rounded-lg border border-line p-4 text-sm font-semibold">
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-slate-950" />
            Stop selling when availability reaches 0
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-line p-4 text-sm font-semibold">
            <input type="checkbox" className="h-4 w-4 accent-slate-950" />
            Highlight rates below minimum threshold
          </label>
          <ToolbarButton tone="dark" onClick={onClose}>Save rules</ToolbarButton>
        </div>
      ) : null}

      {action === "logs" ? (
        <div className="space-y-3 text-sm">
          <p className="rounded-lg border border-line p-4">Current unsaved cell changes: <span className="font-semibold">{changedCount}</span></p>
          <p className="rounded-lg border border-line p-4">Jun 16, 2026 09:40 - FIT LKR rate grid opened</p>
          <p className="rounded-lg border border-line p-4">Jun 16, 2026 09:51 - Inventory sync queued</p>
        </div>
      ) : null}

      {action === "settings" ? (
        <div className="space-y-4">
          <Field label="Default grid days">
            <TextInput type="number" defaultValue={12} />
          </Field>
          <label className="flex items-center gap-3 rounded-lg border border-line p-4 text-sm font-semibold">
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-slate-950" />
            Show weekend colors
          </label>
          <ToolbarButton tone="dark" onClick={onClose}>Save settings</ToolbarButton>
        </div>
      ) : null}
    </Drawer>
  );
}
