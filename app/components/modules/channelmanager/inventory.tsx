"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Users,
  X
} from "lucide-react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import {
  type ChannelAvailabilityRules,
  type ChannelInventoryOperation,
  type ChannelInventoryOverride,
  type ChannelInventoryRoom,
  type ChannelInventoryRowType,
  type ChannelInventorySettings,
  type ChannelInventoryState,
  type ChannelInventoryUnit,
  type ChannelRatePlan,
  type ChannelRoomRecord,
  buildChannelInventoryRooms,
  channelInventoryKey,
  channelRoomRatesKey,
  defaultChannelInventoryState,
  getChannelInventoryCellValue,
  initialChannelRooms
} from "@/app/components/modules/channelmanager/session";

type ChannelManagerInventoryPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

type RowType = ChannelInventoryRowType;
type Operation = ChannelInventoryOperation;
type Unit = ChannelInventoryUnit;
type ActionMode = "bulk" | "rules" | "settings";
type RatePlan = ChannelRatePlan;
type InventoryRoom = ChannelInventoryRoom;
type InventoryOverride = ChannelInventoryOverride;
type AvailabilityRules = ChannelAvailabilityRules;
type InventorySettings = ChannelInventorySettings;
type InventoryState = ChannelInventoryState;

type SelectedCell = {
  roomId: string;
  ratePlanId: string;
  rowType: RowType;
  date: string;
};

type OverrideDraft = {
  roomId: string;
  ratePlanId: string;
  rowType: RowType | "both";
  startDate: string;
  endDate: string;
  restriction: string;
  operation: Operation;
  unit: Unit;
  value: string;
};

const displayFormatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

const startDateDefault = "2026-06-16";

const restrictionOptions = [
  "All Restrictions",
  "Only Availability",
  "Rate And Availability",
  "Availability Offset",
  "Availability Per Rate",
  "Closed To Arrival",
  "Closed To Departure",
  "Max Availability",
  "Max Stay",
  "Min Stay Arrival",
  "Min Stay Through",
  "Rate",
  "Stop Sell"
];

const channelOptions = ["All channels", "Agoda", "Expedia", "Booking.com", "Airbnb", "MakeMyTrip", "Google Hotel / VR"];
const currencyOptions = ["USD", "LKR", "EUR", "GBP"];

export function ChannelManagerInventoryPage({ propertyId, setToast }: ChannelManagerInventoryPageProps) {
  const [channelRooms] = useSessionState<ChannelRoomRecord[]>(channelRoomRatesKey(propertyId), initialChannelRooms);
  const inventoryRooms = useMemo(() => buildChannelInventoryRooms(channelRooms), [channelRooms]);
  const [inventoryState, setInventoryState] = useSessionState<InventoryState>(channelInventoryKey(propertyId), defaultChannelInventoryState);
  const [startDate, setStartDate] = useState(startDateDefault);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [restrictionView, setRestrictionView] = useState("Rate And Availability");
  const [roomFilter, setRoomFilter] = useState("All rooms");
  const [rateFilter, setRateFilter] = useState("All rates");
  const [channelFilter, setChannelFilter] = useState("All channels");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode | null>(null);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [overrideDraft, setOverrideDraft] = useState<OverrideDraft | null>(null);
  const [dirty, setDirty] = useState(false);

  const visibleDates = useMemo(() => buildDateColumns(startDate, 14), [startDate]);

  const visibleRooms = useMemo(() => {
    return inventoryRooms
      .filter((room) => roomFilter === "All rooms" || room.id === roomFilter)
      .map((room) => ({
        ...room,
        ratePlans: room.ratePlans.filter((plan) => rateFilter === "All rates" || rateFilter === plan.id || rateFilter === plan.code)
      }))
      .filter((room) => room.ratePlans.length > 0 || rateFilter === "All rates");
  }, [inventoryRooms, roomFilter, rateFilter]);

  function openValueOverride(cell: SelectedCell) {
    const room = inventoryRooms.find((item) => item.id === cell.roomId);
    const plan = room?.ratePlans.find((item) => item.id === cell.ratePlanId);
    const restriction = cell.rowType === "availability" ? "Only Availability" : "Rate";
    setSelectedCell(cell);
    setOverrideDraft({
      roomId: cell.roomId,
      ratePlanId: cell.ratePlanId,
      rowType: cell.rowType,
      startDate: cell.date,
      endDate: cell.date,
      restriction,
      operation: "set",
      unit: "USD",
      value: String(getCellValue(room, plan, cell.rowType, cell.date, inventoryState))
    });
  }

  function applyOverride(draft: OverrideDraft) {
    const value = Number(draft.value);
    if (!Number.isFinite(value)) {
      setToast("Enter a valid value");
      return;
    }

    const nextOverride: InventoryOverride = {
      id: `override-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      roomId: draft.roomId,
      ratePlanId: draft.ratePlanId,
      rowType: draft.rowType,
      startDate: draft.startDate,
      endDate: draft.endDate,
      restriction: draft.restriction,
      operation: draft.operation,
      unit: draft.unit,
      value
    };

    setInventoryState((current) => ({
      ...current,
      overrides: [...current.overrides, nextOverride]
    }));
    setDirty(true);
    setOverrideDraft(null);
    setActionMode(null);
    setToast("Inventory override applied");
  }

  function saveChanges() {
    setDirty(false);
    setToast("Inventory changes saved for this session");
  }

  function resetChanges() {
    setInventoryState((current) => ({
      ...current,
      overrides: []
    }));
    setSelectedCell(null);
    setDirty(false);
    setToast("Inventory overrides reset");
  }

  function shiftDates(days: number) {
    setStartDate(formatInputDate(addDays(parseInputDate(startDate), days)));
    setCalendarOpen(false);
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-4 py-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
        <SelectControl value={restrictionView} onChange={setRestrictionView} className="w-56">
          {restrictionOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </SelectControl>
        <SelectControl value={roomFilter} onChange={setRoomFilter} className="w-56 text-slate-400">
          <option>All rooms</option>
          {inventoryRooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </SelectControl>
        <SelectControl value={rateFilter} onChange={setRateFilter} className="w-56 text-slate-400">
          <option>All rates</option>
          <option value="RO">RO</option>
          {inventoryRooms.flatMap((room) =>
            room.ratePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {room.name} - {plan.code} {plan.occupancy}
              </option>
            ))
          )}
        </SelectControl>
        <SelectControl value={channelFilter} onChange={setChannelFilter} className="w-56 text-slate-400">
          {channelOptions.map((channel) => (
            <option key={channel}>{channel}</option>
          ))}
        </SelectControl>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ToolbarButton disabled={!dirty} onClick={saveChanges}>
            <CloudUpload className="h-4 w-4" />
            Save Changes
          </ToolbarButton>
          <ToolbarButton disabled={inventoryState.overrides.length === 0} onClick={resetChanges}>
            <RotateCcw className="h-4 w-4" />
            Reset Changes
          </ToolbarButton>
          <div className="relative">
            <ToolbarButton active={actionsOpen} onClick={() => setActionsOpen((current) => !current)}>
              Actions
              <ChevronDown className="h-4 w-4" />
            </ToolbarButton>
            {actionsOpen ? (
              <div className="absolute right-0 top-12 z-20 w-52 rounded-md border border-line bg-white py-2 shadow-xl">
                <ActionMenuItem
                  icon={<SlidersHorizontal className="h-4 w-4" />}
                  onClick={() => {
                    setActionMode("bulk");
                    setActionsOpen(false);
                  }}
                >
                  Bulk Update
                </ActionMenuItem>
                <ActionMenuItem
                  icon={<CalendarDays className="h-4 w-4" />}
                  onClick={() => {
                    setActionMode("rules");
                    setActionsOpen(false);
                  }}
                >
                  Availability Rules
                </ActionMenuItem>
                <ActionMenuItem
                  icon={<Settings className="h-4 w-4" />}
                  onClick={() => {
                    setActionMode("settings");
                    setActionsOpen(false);
                  }}
                >
                  Settings
                </ActionMenuItem>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {inventoryState.rules.weekendStopSell || inventoryState.rules.closedToArrival || inventoryState.rules.closedToDeparture ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Active rules: {buildRulesSummary(inventoryState.rules)}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[1480px]">
          <div className="grid grid-cols-[300px_140px_repeat(14,minmax(76px,1fr))] items-end border-b border-slate-900/70 pb-3">
            <div className="col-span-2 grid grid-cols-[48px_1fr_48px] items-center">
              <button type="button" onClick={() => shiftDates(-14)} className="rounded-md p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-700" aria-label="Previous 14 days">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div className="relative text-center">
                <button type="button" onClick={() => setCalendarOpen((current) => !current)} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xl font-semibold hover:bg-slate-50">
                  {displayFormatter.format(parseInputDate(startDate))}
                  <CalendarDays className="h-5 w-5 text-blue-500" />
                </button>
                {calendarOpen ? (
                  <div className="absolute left-1/2 top-12 z-20 w-72 -translate-x-1/2 rounded-md border border-line bg-white p-4 text-left shadow-xl">
                    <label className="block text-sm font-semibold text-slate-600">
                      Starting date
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => {
                          setStartDate(event.target.value);
                          setCalendarOpen(false);
                        }}
                        className="focus-ring mt-2 h-10 w-full rounded-md border border-line px-3"
                      />
                    </label>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <button type="button" onClick={() => setStartDate(startDateDefault)} className="rounded-md border border-line px-2 py-2 hover:bg-slate-50">
                        16 Jun
                      </button>
                      <button type="button" onClick={() => shiftDates(-7)} className="rounded-md border border-line px-2 py-2 hover:bg-slate-50">
                        -7 days
                      </button>
                      <button type="button" onClick={() => shiftDates(7)} className="rounded-md border border-line px-2 py-2 hover:bg-slate-50">
                        +7 days
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={() => shiftDates(14)} className="rounded-md p-2 text-blue-500 hover:bg-blue-50" aria-label="Next 14 days">
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
            {visibleDates.map((date) => (
              <div key={date.iso} className="text-center text-sm">
                <p>{weekdayFormatter.format(date.value)}</p>
                <p className="text-lg font-semibold leading-tight">{date.value.getDate()}</p>
                <p>{monthFormatter.format(date.value)}</p>
              </div>
            ))}
          </div>

          <div>
            {visibleRooms.map((room) => (
              <div key={room.id} className="border-b border-slate-800/70">
                <div className="grid min-h-12 grid-cols-[300px_140px_repeat(14,minmax(76px,1fr))] items-center border-b border-line">
                  <div className="px-3 text-lg font-semibold">{room.name}</div>
                  <div className="px-3 text-right font-semibold">AVL</div>
                  {visibleDates.map((date) => (
                    <InventoryCell
                      key={`${room.id}-avl-${date.iso}`}
                      value={getDisplayValue(room, null, "availability", date.iso, inventoryState)}
                      muted={false}
                      selected={isSelected(selectedCell, room.id, "availability", "availability", date.iso)}
                      onClick={() => setSelectedCell({ roomId: room.id, ratePlanId: "availability", rowType: "availability", date: date.iso })}
                      onDoubleClick={() => openValueOverride({ roomId: room.id, ratePlanId: "availability", rowType: "availability", date: date.iso })}
                    />
                  ))}
                </div>
                {room.ratePlans.map((plan) => (
                  <div key={plan.id} className="grid min-h-12 grid-cols-[300px_140px_repeat(14,minmax(76px,1fr))] items-center border-b border-line last:border-b-0">
                    <div className="px-5 text-base">{plan.code}</div>
                    <div className="flex items-center justify-end gap-2 px-3 font-semibold">
                      <span className="inline-flex items-center gap-1 font-normal text-slate-600">
                        {plan.linkedOccupancy ? <span className="text-blue-500">{plan.linkedOccupancy}</span> : null}
                        <Users className="h-4 w-4" />
                        {plan.occupancy}
                      </span>
                      RATE
                    </div>
                    {visibleDates.map((date) => (
                      <InventoryCell
                        key={`${room.id}-${plan.id}-${date.iso}`}
                        value={getDisplayValue(room, plan, "rate", date.iso, inventoryState)}
                        muted={plan.muted}
                        selected={isSelected(selectedCell, room.id, plan.id, "rate", date.iso)}
                        onClick={() => setSelectedCell({ roomId: room.id, ratePlanId: plan.id, rowType: "rate", date: date.iso })}
                        onDoubleClick={() => openValueOverride({ roomId: room.id, ratePlanId: plan.id, rowType: "rate", date: date.iso })}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {overrideDraft ? (
        <ValueOverrideModal
          draft={overrideDraft}
          inventoryRooms={inventoryRooms}
          inventoryState={inventoryState}
          setDraft={setOverrideDraft}
          onClose={() => setOverrideDraft(null)}
          onApply={() => applyOverride(overrideDraft)}
        />
      ) : null}

      {actionMode === "bulk" ? (
        <BulkUpdateModal
          inventoryRooms={inventoryRooms}
          visibleDates={visibleDates.map((date) => date.iso)}
          onClose={() => setActionMode(null)}
          onApply={applyOverride}
        />
      ) : null}

      {actionMode === "rules" ? (
        <AvailabilityRulesModal
          rules={inventoryState.rules}
          onClose={() => setActionMode(null)}
          onSave={(rules) => {
            setInventoryState((current) => ({ ...current, rules }));
            setActionMode(null);
            setDirty(true);
            setToast("Availability rules updated");
          }}
        />
      ) : null}

      {actionMode === "settings" ? (
        <InventorySettingsModal
          settings={inventoryState.settings}
          onClose={() => setActionMode(null)}
          onSave={(settings) => {
            setInventoryState((current) => ({ ...current, settings }));
            setActionMode(null);
            setToast("Inventory settings saved");
          }}
        />
      ) : null}
    </main>
  );
}

function InventoryCell({
  value,
  muted,
  selected,
  onClick,
  onDoubleClick
}: {
  value: string | number;
  muted?: boolean;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`h-full min-h-12 w-full px-2 text-center text-base transition hover:bg-amber-100 ${selected ? "bg-amber-200" : ""} ${muted ? "text-slate-300" : "font-semibold text-slate-800"}`}
      title="Double click to override"
    >
      {value}
    </button>
  );
}

function ValueOverrideModal({
  draft,
  inventoryRooms,
  inventoryState,
  setDraft,
  onClose,
  onApply
}: {
  draft: OverrideDraft;
  inventoryRooms: InventoryRoom[];
  inventoryState: InventoryState;
  setDraft: (draft: OverrideDraft) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const room = inventoryRooms.find((item) => item.id === draft.roomId);
  const plan = room?.ratePlans.find((item) => item.id === draft.ratePlanId);
  const currentValue = getCellValue(room, plan, draft.rowType === "availability" ? "availability" : "rate", draft.startDate, inventoryState);
  const previewValue = calculateOverrideValue(currentValue, {
    operation: draft.operation,
    unit: draft.unit,
    value: Number(draft.value) || 0
  });
  const noun = draft.rowType === "availability" ? "Value" : "Price";

  return (
    <CenterModal title="Value Override" onClose={onClose} width="max-w-2xl">
      <div className="space-y-5 px-8 py-7">
        <ReadOnlyLine label="Room Type" value={room?.name ?? "Selected room"} />
        <ReadOnlyLine label="Rate Plan" value={plan ? `${plan.code} ${plan.occupancy}` : "Availability"} />
        <div className="grid grid-cols-[180px_1fr] items-center gap-4">
          <span className="text-right font-medium">Date Range :</span>
          <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-2">
            <input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} className="focus-ring h-10 rounded border border-line px-3" />
            <span className="text-center text-slate-400">-</span>
            <input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} className="focus-ring h-10 rounded border border-line px-3" />
          </div>
        </div>
        <div className="grid grid-cols-[180px_1fr] items-center gap-4">
          <span className="text-right font-medium">Restriction :</span>
          <SelectControl value={draft.restriction} onChange={(value) => setDraft({ ...draft, restriction: value, rowType: restrictionToRowType(value, draft.rowType) })}>
            {restrictionOptions.filter((option) => option !== "All Restrictions").map((option) => (
              <option key={option}>{option}</option>
            ))}
          </SelectControl>
        </div>
        <ReadOnlyLine label={`Current ${draft.rowType === "availability" ? "Value" : "Price"}`} value={String(currentValue)} />
        <div className="grid grid-cols-[180px_1fr] items-center gap-4">
          <span className="text-right font-medium">Adjustment :</span>
          <div className="flex items-center gap-3">
            <SegmentedButton active={draft.operation === "set"} onClick={() => setDraft({ ...draft, operation: "set", unit: "USD" })}>
              SET
            </SegmentedButton>
            <SegmentedButton active={draft.operation === "increase"} onClick={() => setDraft({ ...draft, operation: "increase" })}>
              +
            </SegmentedButton>
            <SegmentedButton active={draft.operation === "decrease"} onClick={() => setDraft({ ...draft, operation: "decrease" })}>
              -
            </SegmentedButton>
            <div className="ml-auto flex rounded border border-line bg-slate-100">
              <SegmentedButton active={draft.unit === "percent"} disabled={draft.operation === "set"} onClick={() => setDraft({ ...draft, unit: "percent" })}>
                %
              </SegmentedButton>
              <SegmentedButton active={draft.unit === "USD"} onClick={() => setDraft({ ...draft, unit: "USD" })}>
                USD
              </SegmentedButton>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[180px_1fr] items-start gap-4">
          <span className="pt-2 text-right font-medium">Value :</span>
          <div>
            <input value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} className="focus-ring h-10 w-full rounded border border-blue-400 px-3" />
            <p className="mt-2 text-sm text-slate-500">
              {noun} will be {draft.operation === "set" ? "set" : draft.operation === "increase" ? "increased" : "decreased"} to {formatValue(previewValue, draft.rowType)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-8 py-4">
        <button type="button" onClick={onClose} className="rounded-md border border-line px-5 py-2 font-semibold hover:bg-slate-50">
          Cancel
        </button>
        <button type="button" onClick={onApply} className="rounded-md bg-blue-500 px-6 py-2 font-semibold text-white hover:bg-blue-600">
          OK
        </button>
      </div>
    </CenterModal>
  );
}

function BulkUpdateModal({
  inventoryRooms,
  visibleDates,
  onClose,
  onApply
}: {
  inventoryRooms: InventoryRoom[];
  visibleDates: string[];
  onClose: () => void;
  onApply: (draft: OverrideDraft) => void;
}) {
  const [draft, setDraft] = useState<OverrideDraft>({
    roomId: "all",
    ratePlanId: "all",
    rowType: "rate",
    startDate: visibleDates[0] ?? startDateDefault,
    endDate: visibleDates[visibleDates.length - 1] ?? startDateDefault,
    restriction: "Rate",
    operation: "set",
    unit: "USD",
    value: "31"
  });

  return (
    <CenterModal title="Bulk Update" subtitle="Apply the same inventory value across rooms, dates, and rate plans." onClose={onClose} width="max-w-2xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApply(draft);
        }}
        className="space-y-4 px-6 py-6"
      >
        <FormGrid>
          <Field label="Room Type">
            <SelectControl value={draft.roomId} onChange={(value) => setDraft({ ...draft, roomId: value })}>
              <option value="all">All room types</option>
              {inventoryRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </SelectControl>
          </Field>
          <Field label="Rate Plan">
            <SelectControl value={draft.ratePlanId} onChange={(value) => setDraft({ ...draft, ratePlanId: value })}>
              <option value="all">All rate plans</option>
              {inventoryRooms.flatMap((room) =>
                room.ratePlans.map((plan) => (
                  <option key={`${room.id}-${plan.id}`} value={plan.id}>
                    {room.name} - {plan.code} {plan.occupancy}
                  </option>
                ))
              )}
            </SelectControl>
          </Field>
          <Field label="Start Date">
            <input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} className="focus-ring h-10 rounded-md border border-line px-3" />
          </Field>
          <Field label="End Date">
            <input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} className="focus-ring h-10 rounded-md border border-line px-3" />
          </Field>
          <Field label="Restriction">
            <SelectControl value={draft.restriction} onChange={(value) => setDraft({ ...draft, restriction: value, rowType: restrictionToRowType(value, draft.rowType) })}>
              {restrictionOptions.filter((option) => option !== "All Restrictions").map((option) => (
                <option key={option}>{option}</option>
              ))}
            </SelectControl>
          </Field>
          <Field label="Value">
            <input value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} className="focus-ring h-10 rounded-md border border-line px-3" />
          </Field>
        </FormGrid>
        <div className="flex items-center justify-between border-t border-line pt-5">
          <div className="flex rounded-md border border-line bg-slate-50">
            {(["set", "increase", "decrease"] as Operation[]).map((operation) => (
              <SegmentedButton key={operation} active={draft.operation === operation} onClick={() => setDraft({ ...draft, operation, unit: operation === "set" ? "USD" : draft.unit })}>
                {operation === "set" ? "SET" : operation === "increase" ? "+" : "-"}
              </SegmentedButton>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-5 py-2 font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="rounded-md bg-slate-950 px-5 py-2 font-semibold text-white hover:bg-slate-800">
              Apply Bulk Update
            </button>
          </div>
        </div>
      </form>
    </CenterModal>
  );
}

function AvailabilityRulesModal({
  rules,
  onClose,
  onSave
}: {
  rules: AvailabilityRules;
  onClose: () => void;
  onSave: (rules: AvailabilityRules) => void;
}) {
  const [draft, setDraft] = useState<AvailabilityRules>(rules);

  return (
    <CenterModal title="Availability Rules" subtitle="Set channel restrictions for the inventory calendar." onClose={onClose} width="max-w-xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        className="space-y-5 px-6 py-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Minimum stay">
            <input value={draft.minStay} onChange={(event) => setDraft({ ...draft, minStay: event.target.value })} className="focus-ring h-10 rounded-md border border-line px-3" />
          </Field>
          <Field label="Maximum stay">
            <input value={draft.maxStay} onChange={(event) => setDraft({ ...draft, maxStay: event.target.value })} className="focus-ring h-10 rounded-md border border-line px-3" />
          </Field>
        </div>
        <CheckField checked={draft.weekendStopSell} onChange={(checked) => setDraft({ ...draft, weekendStopSell: checked })} label="Stop sell weekends" description="Weekend rate cells show SS until this rule is disabled." />
        <CheckField checked={draft.closedToArrival} onChange={(checked) => setDraft({ ...draft, closedToArrival: checked })} label="Closed to arrival" description="Marks this inventory set as closed for arrivals." />
        <CheckField checked={draft.closedToDeparture} onChange={(checked) => setDraft({ ...draft, closedToDeparture: checked })} label="Closed to departure" description="Marks this inventory set as closed for departures." />
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <button type="button" onClick={onClose} className="rounded-md border border-line px-5 py-2 font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-slate-950 px-5 py-2 font-semibold text-white hover:bg-slate-800">
            Save Rules
          </button>
        </div>
      </form>
    </CenterModal>
  );
}

function InventorySettingsModal({
  settings,
  onClose,
  onSave
}: {
  settings: InventorySettings;
  onClose: () => void;
  onSave: (settings: InventorySettings) => void;
}) {
  const [draft, setDraft] = useState<InventorySettings>(settings);

  return (
    <CenterModal title="Inventory Settings" subtitle="Configure how channel inventory updates are handled." onClose={onClose} width="max-w-xl">
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSave(draft);
        }}
        className="space-y-5 px-6 py-6"
      >
        <Field label="Default Channel">
          <SelectControl value={draft.defaultChannel} onChange={(value) => setDraft({ ...draft, defaultChannel: value })}>
            {channelOptions.map((channel) => (
              <option key={channel}>{channel}</option>
            ))}
          </SelectControl>
        </Field>
        <Field label="Currency">
          <SelectControl value={draft.currency} onChange={(value) => setDraft({ ...draft, currency: value })}>
            {currencyOptions.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </SelectControl>
        </Field>
        <CheckField checked={draft.autoSync} onChange={(checked) => setDraft({ ...draft, autoSync: checked })} label="Auto sync after saving" description="Push saved inventory changes to mapped channels." />
        <CheckField checked={draft.protectManualOverrides} onChange={(checked) => setDraft({ ...draft, protectManualOverrides: checked })} label="Protect manual overrides" description="Keep manually overridden cells when bulk updates are applied later." />
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <button type="button" onClick={onClose} className="rounded-md border border-line px-5 py-2 font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-slate-950 px-5 py-2 font-semibold text-white hover:bg-slate-800">
            Save Settings
          </button>
        </div>
      </form>
    </CenterModal>
  );
}

function CenterModal({
  title,
  subtitle,
  onClose,
  children,
  width = "max-w-xl"
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
      <section className={`w-full ${width} overflow-hidden rounded-md bg-white shadow-2xl`}>
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function SelectControl({
  value,
  onChange,
  children,
  className = ""
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={`focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm text-slate-800 ${className}`}>
      {children}
    </select>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  active
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
        active ? "border-blue-400 text-blue-500" : "border-line bg-white text-slate-700 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white`}
    >
      {children}
    </button>
  );
}

function ActionMenuItem({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50">
      {icon}
      {children}
    </button>
  );
}

function SegmentedButton({
  active,
  disabled,
  onClick,
  children
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-w-12 border-r border-line px-4 py-2 text-sm font-semibold last:border-r-0 ${
        active ? "bg-white text-blue-500 ring-1 ring-blue-400" : "bg-slate-50 text-slate-600 hover:bg-white"
      } disabled:cursor-not-allowed disabled:text-slate-300`}
    >
      {children}
    </button>
  );
}

function ReadOnlyLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
      <span className="text-right font-medium">{label} :</span>
      <span>{value}</span>
    </div>
  );
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function CheckField({
  checked,
  onChange,
  label,
  description
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-line p-4">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1" />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="text-sm text-slate-500">{description}</span>
      </span>
    </label>
  );
}

function buildDateColumns(start: string, length: number) {
  const date = parseInputDate(start);
  return Array.from({ length }, (_, index) => {
    const next = addDays(date, index);
    return {
      iso: formatInputDate(next),
      value: next
    };
  });
}

function parseInputDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateInRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function getDisplayValue(room: InventoryRoom | undefined, plan: RatePlan | null, rowType: RowType, date: string, state: InventoryState) {
  if (rowType === "rate" && state.rules.weekendStopSell && isWeekend(date)) return "SS";
  return getCellValue(room, plan, rowType, date, state);
}

function getCellValue(room: InventoryRoom | undefined, plan: RatePlan | null | undefined, rowType: RowType, date: string, state: InventoryState) {
  return getChannelInventoryCellValue(room, plan, rowType, date, state);
}

function calculateOverrideValue(currentValue: number, override: Pick<InventoryOverride, "operation" | "unit" | "value">) {
  if (override.operation === "set") return normalizeValue(override.value);
  const adjustment = override.unit === "percent" ? currentValue * (override.value / 100) : override.value;
  if (override.operation === "increase") return normalizeValue(currentValue + adjustment);
  return normalizeValue(Math.max(0, currentValue - adjustment));
}

function normalizeValue(value: number) {
  return Math.round(value * 100) / 100;
}

function isWeekend(date: string) {
  const day = parseInputDate(date).getDay();
  return day === 0 || day === 6;
}

function formatValue(value: number, rowType: RowType | "both") {
  if (rowType === "availability") return String(Math.round(value));
  return `${value} USD`;
}

function isSelected(selected: SelectedCell | null, roomId: string, ratePlanId: string, rowType: RowType, date: string) {
  return Boolean(selected && selected.roomId === roomId && selected.ratePlanId === ratePlanId && selected.rowType === rowType && selected.date === date);
}

function restrictionToRowType(restriction: string, fallback: RowType | "both"): RowType | "both" {
  if (restriction === "Rate And Availability") return "both";
  if (restriction.includes("Availability") || restriction === "Stop Sell") return "availability";
  if (restriction === "Rate") return "rate";
  return fallback;
}

function buildRulesSummary(rules: AvailabilityRules) {
  const parts = [];
  if (rules.weekendStopSell) parts.push("weekend stop sell");
  if (rules.closedToArrival) parts.push("closed to arrival");
  if (rules.closedToDeparture) parts.push("closed to departure");
  return parts.join(", ");
}
