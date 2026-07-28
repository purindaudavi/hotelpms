import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, Maximize2, Pencil, PlaySquare, Plus, Trash2, X } from "lucide-react";
import { Reservation, ReservationStatus, Room } from "@/app/data/pms-data";
import { createUuid } from "@/app/lib/record-ids";
import { isValidEmail } from "@/app/lib/reservation-email";
import { createRatePlan, getPlanRate } from "../rate-plans";
import { addDays, bookingToForm, daysBetween, parseDate, roomHasOverlap, toISODate } from "../utils";
import { RatePlan, ReservationForm, ReservationRoomDraft } from "../types";
import { IconButton } from "./controls";
import { InputField, SelectField, TextAreaField } from "./form-fields";
import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { businessBlockStorageKey, isBusinessBlockArray, migrateBusinessBlockRecords, roomTypeAvailability } from "@/app/lib/business-block-repository";
import { initialBusinessBlocks, initialCrossBookLinks, initialTravelAgents } from "../../reservation/constants";
import type { BusinessBlock, CrossBookLink, TravelAgent } from "../../reservation/types";
import {
  crossBookedRoomCodes,
  crossBookLinksStorageKey,
  isCrossBookLinkArray,
  normalizeCrossBookLinks,
  roomsAreCrossBooked
} from "@/app/lib/cross-booking";
import { isTravelAgentArray, travelAgentStorageKey } from "@/app/lib/travel-agent-repository";
import type { InventoryCellMap, RoomTypeRecord } from "../../rooms-rates/types";
import { makeInventoryKey } from "../../rooms-rates/utils";

type SaveResult = { ok: true } | { ok: false; error: string };

type ReservationEditorProps = {
  propertyId: string;
  booking: Reservation | null;
  initialForm?: ReservationForm | null;
  reservations: Reservation[];
  roomList: Room[];
  roomTypes: RoomTypeRecord[];
  ratePlans: RatePlan[];
  setRatePlans: React.Dispatch<React.SetStateAction<RatePlan[]>>;
  homeCurrency: string;
  defaultDate: string;
  onClose: () => void;
  onSave: (form: ReservationForm) => Promise<SaveResult>;
  onDelete: (bookingId: string) => void;
  setToast: (message: string) => void;
};

export function ReservationEditor(props: ReservationEditorProps) {
  const { propertyId, booking, initialForm, reservations, roomList, roomTypes, ratePlans, setRatePlans, homeCurrency, defaultDate, onClose, onSave, onDelete, setToast } = props;
  const [crossBookLinks] = useLocalStorageState<CrossBookLink[]>(
    crossBookLinksStorageKey(propertyId),
    initialCrossBookLinks,
    isCrossBookLinkArray,
    normalizeCrossBookLinks
  );
  const [travelAgents] = useLocalStorageState<TravelAgent[]>(travelAgentStorageKey(propertyId), initialTravelAgents, isTravelAgentArray);
  const [form, setForm] = useState(() => {
    return initialForm ? structuredClone(initialForm) : bookingToForm(booking, defaultDate, propertyId, ratePlans, homeCurrency, roomTypes);
  });
  const [businessBlocks] = useLocalStorageState<BusinessBlock[]>(businessBlockStorageKey(propertyId), initialBusinessBlocks, isBusinessBlockArray, (records) => migrateBusinessBlockRecords(records, propertyId, homeCurrency, defaultDate));
  const [inventoryRates] = useLocalStorageState<InventoryCellMap>(
    `staypilot:${propertyId}:rooms-rates:inventory:saved-cells`,
    {}
  );
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState("");
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState(form.roomLines[0]?.id ?? "");
  const selectedPlan = ratePlans.find((plan) => plan.id === form.ratePlanId);

  function planRateFor(plan: RatePlan, roomTypeId: string, reservationForm: ReservationForm = form) {
    const dates = reservationForm.isDayRoom
      ? [reservationForm.checkIn]
      : stayDates(reservationForm.checkIn, reservationForm.checkOut);
    const pricedDates = dates.length ? dates : [reservationForm.checkIn];
    const total = pricedDates.reduce((sum, date) => (
      sum + (inventoryRates[makeInventoryKey(plan.id, roomTypeId, date)] ?? getPlanRate(plan, roomTypeId))
    ), 0);
    return total / pricedDates.length;
  }

  function crossBookConflict(roomCode: string, checkIn: string, checkOut: string) {
    return crossBookedRoomCodes(crossBookLinks, roomCode).find((linkedRoom) =>
      roomHasOverlap(reservations, linkedRoom, checkIn, checkOut, booking?.id)
    );
  }

  function update<K extends keyof ReservationForm>(key: K, value: ReservationForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "bookingSource" && value === "Direct") {
        next.bookingReference = ""; next.tourNumber = ""; next.groupName = "";
      }
      if (key === "bookingSource" && value !== "Travel Agent") {
        next.travelAgentId = ""; next.travelAgentName = ""; next.travelAgentCommission = 0;
      }
      if (key === "status") next.checkInNow = value === "Checked-in";
      if (key === "checkIn" || key === "nights" || key === "isDayRoom") {
        next.checkOut = next.isDayRoom ? next.checkIn : addDays(next.checkIn, Math.max(Number(next.nights), 1));
      }
      if (key === "checkOut" && !next.isDayRoom) next.nights = Math.max(daysBetween(next.checkIn, String(value)), 1);
      if (key === "email" && !isValidEmail(String(value))) next.sendEmail = false;
      if (["checkIn", "checkOut", "nights", "isDayRoom"].includes(String(key)) && selectedPlan) {
        next.roomLines = next.roomLines.map((line) => {
          const rate = planRateFor(selectedPlan, line.roomTypeId, next);
          const hasCustomOverride = !line.isFoc && line.effectiveNightlyRate !== line.originalNightlyRate;
          return {
            ...line,
            originalNightlyRate: rate,
            effectiveNightlyRate: line.isFoc ? 0 : hasCustomOverride ? line.effectiveNightlyRate : rate
          };
        });
      }
      return next;
    });
  }

  function selectRatePlan(planId: string) {
    const plan = ratePlans.find((item) => item.id === planId);
    if (!plan) return;
    applyRatePlan(plan);
  }

  function applyRatePlan(plan: RatePlan) {
    setForm((current) => ({
      ...current, ratePlanId: plan.id, currency: plan.currency, mealPlan: plan.mealPlan,
      refundable: plan.refundable, cancellationPolicy: plan.cancellationPolicy,
      roomLines: current.roomLines.map((line) => {
        const rate = planRateFor(plan, line.roomTypeId, current);
        return { ...line, ratePlanId: plan.id, ratePlanName: plan.name, mealPlan: plan.mealPlan, currency: plan.currency,
          originalNightlyRate: rate, effectiveNightlyRate: line.isFoc ? 0 : rate };
      })
    }));
  }

  function updateRoomLine(id: string, patch: Partial<ReservationRoomDraft>) {
    setForm((current) => ({ ...current, roomLines: current.roomLines.map((line) => line.id === id ? { ...line, ...patch } : line) }));
  }

  function roomOptions(line: ReservationRoomDraft) {
    const checkOut = form.isDayRoom ? addDays(form.checkIn, 1) : form.checkOut;
    return roomList
      .filter((room) => room.type === line.roomType)
      .map((room) => {
        const currentAssignment = line.roomNumber === room.code;
        let unavailableReason = "";

        if (!currentAssignment && (room.status === "Out of Order" || room.status === "Maintenance")) {
          unavailableReason = room.status;
        } else if (!currentAssignment && room.status !== "Available") {
          unavailableReason = room.status;
        } else if (!currentAssignment && form.checkInNow && room.housekeeping !== "Clean") {
          unavailableReason = `${room.housekeeping.toLowerCase()} housekeeping`;
        } else if (!currentAssignment && roomHasOverlap(reservations, room.code, form.checkIn, checkOut, booking?.id)) {
          unavailableReason = "reserved for these dates";
        } else if (!currentAssignment && crossBookConflict(room.code, form.checkIn, checkOut)) {
          unavailableReason = "linked room is reserved";
        } else if (!currentAssignment && form.roomLines.some((other) => other.id !== line.id && (
          other.roomNumber === room.code || roomsAreCrossBooked(crossBookLinks, other.roomNumber, room.code)
        ))) {
          unavailableReason = "already selected";
        }

        return { room, currentAssignment, unavailableReason };
      });
  }

  function preservesRemovedRoomType(roomTypeName: string) {
    if (!booking || form.checkIn !== booking.checkIn || (form.isDayRoom ? form.checkIn : form.checkOut) !== booking.checkOut) return false;
    const currentLines = form.roomLines.filter((line) => line.roomType === roomTypeName);
    const savedLines = booking.reservationRooms?.filter((line) => line.roomType === roomTypeName) ?? [];
    return currentLines.length === savedLines.length && currentLines.every((line) =>
      savedLines.some((savedLine) => savedLine.id === line.id)
    );
  }

  function selectTravelAgent(agentId: string) {
    const agent = travelAgents.find((item) => item.id === agentId);
    setForm((current) => ({
      ...current,
      travelAgentId: agent?.id ?? "",
      travelAgentName: agent?.name ?? "",
      travelAgentCommission: agent?.commission ?? 0
    }));
  }

  function changeRoomType(line: ReservationRoomDraft, typeName: string) {
    const type = roomTypes.find((item) => item.name === typeName) ?? roomTypes[0];
    if (!type) return;
    const plan = selectedPlan ?? ratePlans[0];
    const rate = plan ? planRateFor(plan, type.id) : type.baseRate;
    updateRoomLine(line.id, { roomTypeId: type.id, roomType: type.name, roomId: "", roomNumber: "",
      originalNightlyRate: rate, effectiveNightlyRate: line.isFoc ? 0 : rate });
  }

  function addRoomLine() {
    const type = roomTypes[0];
    if (!type) { setError("Create an active room type before adding reservation rooms."); return; }
    const plan = selectedPlan ?? ratePlans[0];
    const rate = plan ? planRateFor(plan, type.id) : type.baseRate;
    const line: ReservationRoomDraft = { id: createUuid(), roomTypeId: type.id, roomType: type.name, roomId: "", roomNumber: "",
      occupancy: "Double", bedType: "Bed Type", adults: 2, children: 0, ratePlanId: plan?.id ?? "", ratePlanName: plan?.name ?? "",
      mealPlan: plan?.mealPlan ?? form.mealPlan, currency: plan?.currency ?? form.currency, originalNightlyRate: rate, effectiveNightlyRate: rate,
      isFoc: false, focReason: "", requiresManagerApproval: false };
    update("roomLines", [...form.roomLines, line]); setEditingLineId(line.id);
  }

  function removeRoomLine(id: string) {
    if (form.roomLines.length === 1) { setError("A reservation must contain at least one room."); return; }
    if (!window.confirm("Remove this room from the reservation?")) return;
    update("roomLines", form.roomLines.filter((line) => line.id !== id));
  }

  function toggleFoc(line: ReservationRoomDraft, checked: boolean) {
    if (checked && !window.confirm("Mark the accommodation charge as zero? Meals, minibar, POS, laundry and other extras remain chargeable. A reason is required and manager approval will be recorded.")) return;
    updateRoomLine(line.id, checked
      ? { isFoc: true, originalNightlyRate: line.effectiveNightlyRate, effectiveNightlyRate: 0, focSelectedBy: "ASIRI PERERA", focSelectedAt: new Date().toISOString(), requiresManagerApproval: true }
      : { isFoc: false, effectiveNightlyRate: line.originalNightlyRate, focReason: "", focSelectedBy: undefined, focSelectedAt: undefined, requiresManagerApproval: false });
  }

  function validate() {
    if (!form.guest.trim()) return "Guest name is required.";
    if (form.bookingSource !== "Direct" && !form.bookingReference.trim()) return "Booking reference is required for external booking sources.";
    if (form.bookingSource === "Travel Agent" && !form.travelAgentId) return "Select a travel agent for this reservation.";
    if (form.bookingSource === "Travel Agent" && !travelAgents.some((agent) => agent.id === form.travelAgentId)) return "The selected travel agent no longer exists.";
    if (!form.isDayRoom && form.checkOut <= form.checkIn) return "Check-out must be after check-in.";
    if (!form.roomLines.length) return "Add at least one room.";
    const assignedRoomNumbers = form.roomLines.map((line) => line.roomNumber).filter(Boolean);
    if (new Set(assignedRoomNumbers).size !== assignedRoomNumbers.length) return "The same physical room cannot be assigned twice.";
    for (const line of form.roomLines) {
      if (!line.roomNumber) continue;
      const linkedLine = form.roomLines.find((other) =>
        other.id !== line.id && other.roomNumber && roomsAreCrossBooked(crossBookLinks, line.roomNumber, other.roomNumber)
      );
      if (linkedLine) return `Rooms ${line.roomNumber} and ${linkedLine.roomNumber} are cross-booked and cannot be assigned together.`;
    }
    if (!form.businessBlockId) {
      const dates = stayDates(form.checkIn, form.isDayRoom ? addDays(form.checkIn, 1) : form.checkOut);
      const counts = form.roomLines.reduce<Record<string, number>>((result, line) => ({ ...result, [line.roomType]: (result[line.roomType] || 0) + 1 }), {});
      for (const [roomTypeName, requested] of Object.entries(counts)) {
        const configuredType = roomTypes.find((type) => type.name === roomTypeName);
        if (!configuredType) {
          if (preservesRemovedRoomType(roomTypeName)) continue;
          return `${roomTypeName} is no longer configured. Select an active room type before changing this reservation's stay or rooms.`;
        }
        const capacity = configuredType.rooms.length;
        for (const date of dates) {
          const available = roomTypeAvailability(roomTypeName, date, capacity, reservations.filter((item) => item.id !== booking?.id), businessBlocks);
          if (requested > available) return `${roomTypeName} has only ${available} sellable room(s) remaining on ${date} after active Business Block holds.`;
        }
      }
    }
    for (const line of form.roomLines) {
      const physicalRoomRequired = form.checkInNow || form.status === "Checked-in";
      if (!line.roomNumber) {
        if (physicalRoomRequired) return `Assign an available, clean room before checking in ${line.roomType}.`;
        if (line.isFoc && !line.focReason.trim()) return `Enter a complimentary reason for ${line.roomType}.`;
        continue;
      }
      const room = roomList.find((item) => item.code === line.roomNumber);
      const savedOnExisting = Boolean(booking && (booking.reservationRooms?.some((item) => item.roomNumber === line.roomNumber) || booking.room === line.roomNumber));
      if (!room) {
        if (savedOnExisting) continue;
        return `Room ${line.roomNumber} is no longer configured. Select a current physical room.`;
      }
      if (!savedOnExisting && room.status !== "Available") return `Room ${line.roomNumber} is not operationally available.`;
      if (physicalRoomRequired && !savedOnExisting && room.housekeeping !== "Clean") return `Room ${line.roomNumber} must be clean before check-in.`;
      if (line.isFoc && !line.focReason.trim()) return `Enter a complimentary reason for room ${line.roomNumber}.`;
      if (roomHasOverlap(reservations, line.roomNumber, form.checkIn, form.isDayRoom ? addDays(form.checkIn, 1) : form.checkOut, booking?.id)) return `Room ${line.roomNumber} overlaps another active reservation.`;
      const linkedConflict = crossBookConflict(line.roomNumber, form.checkIn, form.isDayRoom ? addDays(form.checkIn, 1) : form.checkOut);
      if (linkedConflict) return `Room ${line.roomNumber} is unavailable because cross-booked room ${linkedConflict} has an overlapping reservation.`;
    }
    if (form.sendEmail && !isValidEmail(form.email)) return "Enter a valid guest email before sending confirmation.";
    return "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    submitLock.current = true;
    setSaving(true); setError("");
    try {
      const result = await onSave(form);
      if (!result.ok) setError(result.error);
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }

  const total = useMemo(() => form.roomLines.reduce((sum, line) => sum + line.effectiveNightlyRate * (form.isDayRoom ? 1 : Math.max(form.nights, 1)), 0), [form]);

  return (
    <div className="fixed inset-0 z-50 bg-black/45">
      <form onSubmit={submit} className="ml-auto flex h-full w-full max-w-[1380px] flex-col rounded-l-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-8"><h2 className="text-xl font-semibold">Reservation</h2><Bot className="h-11 w-11 text-sky-500" /><span className="text-sm font-semibold text-slate-700">Hi, need help?</span></div>
          <div className="flex gap-4"><IconButton label="Expand" onClick={() => setToast("Reservation panel expanded")}><Maximize2 className="h-4 w-4" /></IconButton>
            <button type="button" className="grid h-12 w-12 place-items-center rounded-full bg-cyan-300" onClick={() => setToast("Reservation guide opened")}><PlaySquare className="h-5 w-5" /></button>
            <IconButton label="Close" onClick={onClose}><X className="h-5 w-5" /></IconButton></div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {form.businessBlockId ? <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">Linked Business Block reservation. Saving updates pickup and remaining counts automatically.</div> : null}
          {error ? <div role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <section className="rounded-md bg-slate-50 p-3"><div className="grid gap-3 lg:grid-cols-4">
            <SelectField
              label="Booking Source"
              value={form.bookingSource}
              onChange={(value) => update("bookingSource", value)}
              options={[
                "Direct",
                "Travel Agent",
                ...(!["Direct", "Travel Agent"].includes(form.bookingSource) ? [form.bookingSource] : [])
              ]}
            />
            {form.bookingSource === "Travel Agent" ? (
              <SelectField
                label="Travel Agent *"
                value={form.travelAgentId}
                onChange={selectTravelAgent}
                options={[
                  { value: "", label: "Select travel agent" },
                  ...travelAgents
                    .filter((agent) => agent.status === "Active" || agent.id === form.travelAgentId)
                    .map((agent) => ({ value: agent.id, label: `${agent.name} (${agent.code}) · ${agent.commission}%` }))
                ]}
              />
            ) : null}
            <InputField label={`Booking Ref.${form.bookingSource === "Direct" ? "" : " *"}`} value={form.bookingReference} onChange={(value) => update("bookingReference", value)} placeholder={form.bookingSource === "Direct" ? "Not required for direct bookings" : "Required external reference"} disabled={form.bookingSource === "Direct"} />
            <InputField label="Tour No" value={form.tourNumber} onChange={(value) => update("tourNumber", value)} placeholder="Tour No" disabled={form.bookingSource === "Direct"} />
            <InputField label="Group Name" value={form.groupName} onChange={(value) => update("groupName", value)} placeholder="Group Name" disabled={form.bookingSource === "Direct"} />
            <SelectField label="Status" value={form.status} onChange={(value) => update("status", value as ReservationStatus)} options={["Confirmed", "Tentative", "Checked-in", "Checked-out", "Cancelled", "No Show", "Blocked"]} />
            <div className="grid gap-1"><label className="text-sm font-semibold">Check-in</label><div className="flex items-center gap-2"><input value={form.checkIn} onChange={(e) => update("checkIn", e.target.value)} type="date" className="focus-ring h-11 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm" /><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isDayRoom} onChange={(e) => update("isDayRoom", e.target.checked)} />Day room</label></div></div>
            <InputField label="Nights" value={String(form.nights)} onChange={(value) => update("nights", Number(value))} type="number" disabled={form.isDayRoom} />
            <InputField label="Check-out" value={form.checkOut} onChange={(value) => update("checkOut", value)} type="date" disabled={form.isDayRoom} />
          </div>{form.bookingSource === "Travel Agent" && form.travelAgentId ? <p className="mt-2 text-xs text-slate-500">Performance will be credited to {form.travelAgentName}. Commission saved for this reservation: {form.travelAgentCommission}%.</p> : null}</section>

          <section className="mt-4 rounded-md bg-slate-50 p-3">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1.2fr]"><div className="flex gap-2"><SelectField label="Rate Plan" value={form.ratePlanId} onChange={selectRatePlan} options={ratePlans.filter((p) => (p.active && form.checkIn >= p.validFrom && form.checkIn <= p.validTo) || p.id === form.ratePlanId).map((p) => ({ value: p.id, label: p.name }))} /><button type="button" aria-label="Create rate plan" className="mt-7 grid h-11 w-11 place-items-center rounded-md border border-line bg-white" onClick={() => setRateDialogOpen(true)}><Plus className="h-4 w-4" /></button></div>
              <SelectField label="Currency" value={form.currency} onChange={(value) => update("currency", value)} options={[homeCurrency, "USD", "EUR", "GBP"].filter((v, i, a) => a.indexOf(v) === i)} />
              <SelectField label="Meal Plan" value={form.mealPlan} onChange={(value) => update("mealPlan", value)} options={["Room Only", "Bed & Breakfast", "Half Board", "Full Board"]} /></div>
            <p className="mt-2 text-xs text-slate-500">Selecting a rate plan fills currency, meal plan, cancellation terms and room rates. Edited values are treated as overrides.</p>
            <div className="mt-1 flex gap-3 text-xs text-amber-600">{selectedPlan && form.currency !== selectedPlan.currency ? <span>Currency: Custom override</span> : null}{selectedPlan && form.mealPlan !== selectedPlan.mealPlan ? <span>Meal plan: Custom override</span> : null}</div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1120px] text-sm"><thead><tr className="text-left text-slate-500">{["Room Type", "Room No", "Occupancy", "Bed", "Adult", "Child", "Rate", "Complimentary (FOC)", "Edit", ""].map((head, index) => <th key={`${head}-${index}`} className="px-2 py-2">{head}</th>)}</tr></thead>
              <tbody>{form.roomLines.map((line) => { const editable = editingLineId === line.id; const options = roomOptions(line); const archivedType = !roomTypes.some((type) => type.name === line.roomType); const archivedRoom = Boolean(line.roomNumber && !options.some(({ room }) => room.code === line.roomNumber)); const planRate = selectedPlan ? planRateFor(selectedPlan, line.roomTypeId) : line.originalNightlyRate; return <tr key={line.id} className="border-t border-line">
                <td className="px-2 py-2"><select disabled={!editable} value={line.roomType} onChange={(e) => changeRoomType(line, e.target.value)} className="h-10 w-full rounded-md border border-line bg-white px-2 disabled:bg-slate-100">{archivedType ? <option value={line.roomType}>{line.roomType} (archived)</option> : null}{roomTypes.filter((type) => type.active || type.name === line.roomType).map((type) => <option key={type.id} value={type.name}>{type.name}{type.active ? "" : " (disabled)"}</option>)}</select></td>
                <td className="px-2 py-2"><select disabled={!editable} value={line.roomNumber} onChange={(e) => { const room = roomList.find((item) => item.code === e.target.value); updateRoomLine(line.id, { roomNumber: e.target.value, roomId: room?.id ?? "" }); }} className="h-10 w-full rounded-md border border-line bg-white px-2 disabled:bg-slate-100"><option value="">Select</option>{archivedRoom ? <option value={line.roomNumber}>{line.roomNumber} — archived assignment</option> : null}{options.map(({ room, currentAssignment, unavailableReason }) => <option key={room.id} value={room.code} disabled={Boolean(unavailableReason)}>{room.code} — {currentAssignment ? "Current assignment" : unavailableReason || "Available"}</option>)}</select></td>
                <td className="px-2 py-2"><select disabled={!editable} value={line.occupancy} onChange={(e) => updateRoomLine(line.id, { occupancy: e.target.value })} className="h-10 rounded-md border border-line bg-white px-2 disabled:bg-slate-100">{["Single", "Double", "Triple", "Family"].map((v) => <option key={v}>{v}</option>)}</select></td>
                <td className="px-2 py-2"><select disabled={!editable} value={line.bedType} onChange={(e) => updateRoomLine(line.id, { bedType: e.target.value })} className="h-10 rounded-md border border-line bg-white px-2 disabled:bg-slate-100">{["Bed Type", "King Bed", "Twin Bed", "Queen Bed"].map((v) => <option key={v}>{v}</option>)}</select></td>
                <td className="px-2 py-2"><input disabled={!editable} type="number" min="1" value={line.adults} onChange={(e) => updateRoomLine(line.id, { adults: Number(e.target.value) })} className="h-10 w-16 rounded-md border border-line px-2 disabled:bg-slate-100" /></td>
                <td className="px-2 py-2"><input disabled={!editable} type="number" min="0" value={line.children} onChange={(e) => updateRoomLine(line.id, { children: Number(e.target.value) })} className="h-10 w-16 rounded-md border border-line px-2 disabled:bg-slate-100" /></td>
                <td className="px-2 py-2"><input disabled={!editable || line.isFoc} type="number" min="0" value={line.effectiveNightlyRate} onChange={(e) => updateRoomLine(line.id, { effectiveNightlyRate: Number(e.target.value) })} className="h-10 w-28 rounded-md border border-yellow-400 px-2 disabled:bg-slate-100" />{!line.isFoc && line.effectiveNightlyRate !== planRate ? <span className="block text-[10px] text-amber-600">Custom override</span> : null}</td>
                <td className="px-2 py-2"><input aria-label="Complimentary (FOC)" type="checkbox" checked={line.isFoc} onChange={(e) => toggleFoc(line, e.target.checked)} /></td>
                <td className="px-2 py-2"><button type="button" onClick={() => setEditingLineId(editable ? "" : line.id)}><Pencil className="h-4 w-4" /></button></td>
                <td className="px-2 py-2"><button type="button" className="text-red-500" onClick={() => removeRoomLine(line.id)}><Trash2 className="h-4 w-4" /></button></td>
                {line.isFoc ? <td className="px-2 py-2" colSpan={10}><input value={line.focReason} onChange={(e) => updateRoomLine(line.id, { focReason: e.target.value })} placeholder="Complimentary reason (required)" className="h-10 w-full rounded-md border border-amber-300 bg-amber-50 px-3" /><p className="mt-1 text-xs text-amber-700">Effective rate is zero; original rate {line.originalNightlyRate.toFixed(2)} is retained. Manager approval is recorded but not enforced in this demo.</p></td> : null}
              </tr>; })}</tbody></table></div>
            <div className="mt-3 flex items-center justify-between"><button type="button" onClick={addRoomLine} className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold">Add Room</button><strong>Total: {form.currency} {total.toFixed(2)}</strong></div>
          </section>

          <section className="mt-4 rounded-md bg-slate-50 p-3"><div className="grid gap-3 lg:grid-cols-[0.6fr_1.8fr]"><SelectField label="Title" value={form.title} onChange={(value) => update("title", value)} options={["Select", "Mr", "Mrs", "Ms", "Dr"]} /><InputField label="Guest Name *" value={form.guest} onChange={(value) => update("guest", value)} placeholder="Enter guest name" /></div><div className="mt-3 grid gap-3 lg:grid-cols-3"><InputField label="Mobile" value={form.phone} onChange={(value) => update("phone", value)} placeholder="Mobile" /><InputField label="Email" value={form.email} onChange={(value) => update("email", value)} placeholder="Enter guest email" /><SelectField label="Country" value={form.country} onChange={(value) => update("country", value)} options={["Select Country", "Sri Lanka", "India", "Bangladesh", "United Kingdom", "Australia"]} /></div></section>
          <div className="mt-4 grid gap-5 xl:grid-cols-3">
            <TextAreaField label="Reservation Remarks" value={form.reservationRemarks} onChange={(value) => update("reservationRemarks", value)} placeholder="General notes about this reservation" />
            <TextAreaField label="Guest Remarks" value={form.guestRemarks} onChange={(value) => update("guestRemarks", value)} placeholder="Visible to the guest and included in confirmation email" />
            <TextAreaField label="Internal Remarks (staff only)" value={form.internalRemarks} onChange={(value) => update("internalRemarks", value)} placeholder="Never included in guest email" />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.checkInNow} onChange={(e) => update("checkInNow", e.target.checked)} />Check in guest immediately</label><label className={`flex items-center gap-2 text-sm ${isValidEmail(form.email) ? "text-slate-600" : "text-slate-400"}`}><input type="checkbox" disabled={!isValidEmail(form.email)} checked={form.sendEmail} onChange={(e) => update("sendEmail", e.target.checked)} />Send confirmation email to guest</label><div className="flex gap-2">{booking ? <button type="button" className="rounded-md border border-red-200 px-4 text-sm text-red-600" onClick={() => { if (window.confirm("Delete this reservation?")) onDelete(booking.id); }}>Delete</button> : null}<button type="submit" disabled={saving} className="h-12 rounded-md bg-ink px-8 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : booking ? "Update" : "Reserve"}</button></div></footer>
      </form>
      {rateDialogOpen ? <RatePlanDialog propertyId={propertyId} homeCurrency={homeCurrency} defaultDate={defaultDate} roomTypes={roomTypes} onClose={() => setRateDialogOpen(false)} onCreate={(plan) => { setRatePlans((current) => [...current, plan]); if (plan.active) applyRatePlan(plan); setRateDialogOpen(false); }} /> : null}
    </div>
  );
}

function stayDates(start: string, end: string) { const dates: string[] = []; const date = parseDate(start); const last = parseDate(end); while (date < last) { dates.push(toISODate(date)); date.setDate(date.getDate() + 1); } return dates; }

function RatePlanDialog({ propertyId, homeCurrency, defaultDate, roomTypes, onClose, onCreate }: { propertyId: string; homeCurrency: string; defaultDate: string; roomTypes: RoomTypeRecord[]; onClose: () => void; onCreate: (plan: RatePlan) => void }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(homeCurrency);
  const [mealPlan, setMealPlan] = useState("Room Only");
  const [baseRate, setBaseRate] = useState(0);
  const [roomTypeRates, setRoomTypeRates] = useState<Record<string, number>>({});
  const [refundable, setRefundable] = useState(true);
  const [active, setActive] = useState(true);
  const [policy, setPolicy] = useState("Free cancellation until 24 hours before check-in.");

  function create() {
    if (!name.trim() || baseRate < 0) return;
    onCreate(createRatePlan(propertyId, {
      name: name.trim(),
      code: "FIT",
      currency,
      mealPlan,
      baseRate,
      roomTypeRates: Object.fromEntries(roomTypes.map((type) => [
        type.id,
        Object.prototype.hasOwnProperty.call(roomTypeRates, type.id) ? roomTypeRates[type.id] : baseRate
      ])),
      resident: false,
      validFrom: defaultDate,
      validTo: addDays(defaultDate, 365),
      sellMode: "Per Room",
      rateMode: "Manual",
      refundable,
      cancellationPolicy: policy,
      active,
      locked: false,
      isCustom: true
    }));
  }

  return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between"><h3 className="text-lg font-semibold">Create Rate Plan</h3><button type="button" onClick={onClose}><X className="h-5 w-5" /></button></div>
      <div className="mt-4 grid gap-3">
        <InputField label="Plan name" value={name} onChange={setName} />
        <SelectField label="Currency" value={currency} onChange={setCurrency} options={[homeCurrency, "USD", "EUR", "GBP"].filter((v, i, a) => a.indexOf(v) === i)} />
        <SelectField label="Meal plan" value={mealPlan} onChange={setMealPlan} options={["Room Only", "Bed & Breakfast", "Half Board", "Full Board"]} />
        <InputField label="Base nightly rate" type="number" value={String(baseRate)} onChange={(value) => setBaseRate(Number(value))} />
        <fieldset className="rounded-md border border-line p-3"><legend className="px-1 text-sm font-semibold">Optional room-type overrides</legend>
          <div className="grid gap-2">{roomTypes.map((type) => <InputField key={type.id} label={type.name} type="number" value={String(roomTypeRates[type.id] ?? "")} onChange={(value) => setRoomTypeRates((current) => ({ ...current, [type.id]: Number(value) }))} />)}</div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={refundable} onChange={(event) => setRefundable(event.target.checked)} />Refundable</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Active</label>
        <TextAreaField label="Cancellation policy" value={policy} onChange={setPolicy} />
      </div>
      <div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-md border border-line px-4 py-2" onClick={onClose}>Cancel</button><button type="button" className="rounded-md bg-ink px-4 py-2 text-white" onClick={create}>Create</button></div>
    </div>
  </div>;
}
