"use client";

import type { Dispatch, SetStateAction } from "react";
import { Fragment, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Save } from "lucide-react";
import { currencyOptions } from "../constants";
import type { InventoryCellMap, RatePlan, RoomTypeRecord, RoomsRatesModuleProps } from "../types";
import { addDays, availabilityFor, buildInventoryCells, dateLabel, makeInventoryKey, weekdayLabel } from "../utils";
import { RatePlanDrawer } from "../components/rate-plan-drawer";
import { Drawer, Field, Panel, RoomsRatesFrame, SelectInput, TextInput, ToolbarButton } from "../components/rooms-rates-ui";
import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { createRatePlanRecord, getDailyRates, getRatesApiErrorMessage, saveDailyRates, type DailyRate } from "@/app/lib/rates-api";
import { businessBlockStorageKey, isBusinessBlockArray, migrateBusinessBlockRecords } from "@/app/lib/business-block-repository";
import { initialBusinessBlocks } from "../../reservation/constants";
import type { BusinessBlock } from "../../reservation/types";
import { property } from "@/app/data/pms-data";
import { getPlanRate } from "../../front-desk/rate-plans";

type InventoryPageProps = RoomsRatesModuleProps & {
  roomTypes: RoomTypeRecord[];
  ratePlans: RatePlan[];
  setRatePlans: Dispatch<SetStateAction<RatePlan[]>>;
  ratesLoading: boolean;
  ratesError: string;
  refreshRatePlans: () => Promise<void>;
};

type InventoryAction = "" | "bulk" | "rules" | "logs" | "settings";
type ActiveInventoryAction = Exclude<InventoryAction, "">;

export function InventoryPage({ propertyId, roomTypes, ratePlans, setRatePlans, ratesLoading, ratesError, refreshRatePlans, reservations, setToast }: InventoryPageProps) {
  const [businessBlocks] = useLocalStorageState<BusinessBlock[]>(businessBlockStorageKey(propertyId), initialBusinessBlocks, isBusinessBlockArray, (records) => migrateBusinessBlockRecords(records, propertyId, property.currency, property.systemDate));
  const [currency, setCurrency] = useState("All Currencies");
  const [rateCode, setRateCode] = useState("All Rate Codes");
  const [option, setOption] = useState("All Inventory");
  const [roomsFilter, setRoomsFilter] = useState("All Rooms");
  const [ratesFilter, setRatesFilter] = useState("All Rates");
  const [startDate, setStartDate] = useState(property.systemDate);
  const [gridDays, setGridDays] = useState(12);
  const dates = useMemo(() => Array.from({ length: gridDays }, (_, index) => addDays(startDate, index)), [gridDays, startDate]);
  const [savedCells, setSavedCells] = useState<InventoryCellMap>({});
  const [cells, setCells] = useState<InventoryCellMap>({});
  const [dailyDetails, setDailyDetails] = useState<Record<string, DailyRate>>({});
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dailyError, setDailyError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<InventoryAction>("");
  const dirty = JSON.stringify(cells) !== JSON.stringify(savedCells);
  const rateCodes = useMemo(() => ["All Rate Codes", ...Array.from(new Set(ratePlans.map((plan) => plan.code))).sort()], [ratePlans]);

  const loadDailyRates = useCallback(async () => {
    const base = buildInventoryCells(ratePlans, roomTypes, dates);
    if (!ratePlans.length || !dates.length) {
      setSavedCells(base);
      setCells(base);
      setDailyDetails({});
      return;
    }
    setLoadingDaily(true);
    setDailyError("");
    try {
      const records = (await Promise.all(ratePlans.map((plan) => getDailyRates(propertyId, plan.id, dates[0], dates[dates.length - 1])))).flat();
      const next = { ...base };
      const details: Record<string, DailyRate> = {};
      records.forEach((record) => {
        const key = makeInventoryKey(record.ratePlanId, record.roomTypeId, record.date);
        next[key] = record.amount;
        details[key] = record;
      });
      setSavedCells(next);
      setCells(next);
      setDailyDetails(details);
    } catch (loadError) {
      setDailyError(getRatesApiErrorMessage(loadError));
      setSavedCells(base);
      setCells(base);
    } finally {
      setLoadingDaily(false);
    }
  }, [dates, propertyId, ratePlans, roomTypes]);

  useEffect(() => {
    void loadDailyRates();
  }, [loadDailyRates]);

  const filteredRoomTypes = useMemo(() => roomTypes.filter((type) => roomsFilter === "All Rooms" || type.name === roomsFilter), [roomTypes, roomsFilter]);
  const filteredPlans = useMemo(
    () =>
      ratePlans.filter((plan) => {
        if (currency !== "All Currencies" && plan.currency !== currency) return false;
        if (rateCode !== "All Rate Codes" && plan.code !== rateCode) return false;
        if (ratesFilter === "Active" && !plan.active) return false;
        if (ratesFilter === "Disabled" && plan.active) return false;
        if (option === "Locked Only" && !plan.locked) return false;
        return true;
      }),
    [currency, option, rateCode, ratePlans, ratesFilter]
  );

  function setCellValue(planId: string, roomTypeId: string, date: string, value: number) {
    setCells((current) => ({ ...current, [makeInventoryKey(planId, roomTypeId, date)]: value }));
  }

  function currentCellValue(plan: RatePlan, roomType: RoomTypeRecord, date: string) {
    const key = makeInventoryKey(plan.id, roomType.id, date);
    return cells[key] ?? savedCells[key] ?? getPlanRate(plan, roomType.id);
  }

  async function saveRate(plan: RatePlan) {
    try {
      const saved = await createRatePlanRecord(propertyId, plan);
      setRatePlans((current) => [saved, ...current]);
      setCreateOpen(false);
      setToast("Rate plan created in MongoDB");
    } catch (saveError) {
      throw new Error(getRatesApiErrorMessage(saveError));
    }
  }

  async function saveChanges() {
    const changedKeys = Object.keys(cells).filter((key) => cells[key] !== savedCells[key]);
    if (!changedKeys.length) return;
    setSaving(true);
    setDailyError("");
    try {
      const grouped = new Map<string, Array<Omit<DailyRate, "id" | "propertyId" | "ratePlanId">>>();
      changedKeys.forEach((key) => {
        const [ratePlanId, roomTypeId, date] = key.split("::");
        const existing = dailyDetails[key];
        const entry = {
          roomTypeId,
          date,
          amount: Number(cells[key]),
          stopSell: existing?.stopSell ?? false,
          minimumStay: existing?.minimumStay ?? 1,
          maximumStay: existing?.maximumStay ?? null,
          closedToArrival: existing?.closedToArrival ?? false,
          closedToDeparture: existing?.closedToDeparture ?? false,
          notes: existing?.notes ?? ""
        };
        grouped.set(ratePlanId, [...(grouped.get(ratePlanId) ?? []), entry]);
      });
      await Promise.all(Array.from(grouped, ([ratePlanId, updates]) => saveDailyRates(propertyId, ratePlanId, updates)));
      await loadDailyRates();
      setToast("Daily rates saved in MongoDB");
    } catch (saveError) {
      setDailyError(getRatesApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    setCells(savedCells);
    setToast("Inventory changes reset");
  }

  function applyBulkRate(value: number) {
    const visiblePlanIds = new Set(filteredPlans.map((plan) => plan.id));
    const visibleRoomTypeIds = new Set(filteredRoomTypes.map((roomType) => roomType.id));
    setCells((current) => {
      const next = { ...current };
      ratePlans.forEach((plan) => {
        if (!visiblePlanIds.has(plan.id) || plan.locked) return;
        roomTypes.forEach((roomType) => {
          if (!visibleRoomTypeIds.has(roomType.id)) return;
          dates.forEach((date) => {
            next[makeInventoryKey(plan.id, roomType.id, date)] = value;
          });
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
          {rateCodes.map((item) => (
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
        <ToolbarButton tone="dark" icon={<Save className="h-4 w-4" />} onClick={() => void saveChanges()} disabled={!dirty || saving || loadingDaily}>
          {saving ? "Saving..." : "Save Changes"}
        </ToolbarButton>
        <ToolbarButton icon={<RefreshCw className="h-4 w-4" />} onClick={() => void Promise.all([refreshRatePlans(), loadDailyRates()])} disabled={saving || loadingDaily || ratesLoading}>
          Refresh
        </ToolbarButton>
        <ToolbarButton tone="dark" onClick={() => setCreateOpen(true)}>
          Add Rate
        </ToolbarButton>
      </div>

      {ratesError || dailyError ? <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{ratesError || dailyError}</div> : null}
      {ratesLoading || loadingDaily ? <div className="rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-500">Loading rate plans and daily prices from MongoDB...</div> : null}

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
              {startDate} - {addDays(startDate, gridDays - 1)}
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
                const plans = filteredPlans;
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
                      <tr key={`${roomType.id}-${plan.id}`}>
                        <td className="sticky left-0 z-10 border border-line bg-white px-3 py-3">
                          <p className="font-semibold text-slate-600">{plan.name}</p>
                          <p className="text-xs text-slate-500">{plan.mealPlan} ({plan.currency}) - {plan.code}</p>
                        </td>
                        {dates.map((date) => (
                          <td key={date} className="border border-line px-2 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={currentCellValue(plan, roomType, date)}
                              disabled={plan.locked || !plan.active}
                              onChange={(event) => setCellValue(plan.id, roomType.id, date, Number(event.target.value))}
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

      {createOpen ? (
        <RatePlanDrawer
          mode="create"
          propertyId={propertyId}
          ratePlan={null}
          ratePlans={ratePlans}
          roomTypes={roomTypes}
          onClose={() => setCreateOpen(false)}
          onSave={saveRate}
        />
      ) : null}
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
