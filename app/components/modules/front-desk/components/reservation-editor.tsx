import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, Maximize2, Pencil, PlaySquare, Plus, Trash2, X } from "lucide-react";
import { Reservation, ReservationStatus, Room, roomTypes } from "@/app/data/pms-data";
import { createUuid } from "@/app/lib/record-ids";
import { isValidEmail } from "@/app/lib/reservation-email";
import { createRatePlan, getPlanRate } from "../rate-plans";
import { addDays, bookingToForm, daysBetween, roomHasOverlap } from "../utils";
import { RatePlan, ReservationForm, ReservationRoomDraft } from "../types";
import { IconButton } from "./controls";
import { InputField, SelectField, TextAreaField } from "./form-fields";
import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { businessBlockStorageKey, isBusinessBlockArray, migrateBusinessBlockRecords, roomTypeAvailability } from "@/app/lib/business-block-repository";
import { initialBusinessBlocks } from "../../reservation/constants";
import type { BusinessBlock } from "../../reservation/types";

type SaveResult = { ok: true } | { ok: false; error: string };

type ReservationEditorProps = {
  propertyId: string;
  booking: Reservation | null;
  initialForm?: ReservationForm | null;
  reservations: Reservation[];
  roomList: Room[];
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
  const { propertyId, booking, initialForm, reservations, roomList, ratePlans, setRatePlans, homeCurrency, defaultDate, onClose, onSave, onDelete, setToast } = props;
  const [form, setForm] = useState(() => {
    const initial = initialForm ? structuredClone(initialForm) : bookingToForm(booking, defaultDate, propertyId, ratePlans, homeCurrency);
    if (booking) return initial;
    const firstLine = initial.roomLines[0];
    const available = roomList.find((room) => room.type === firstLine.roomType && room.status === "Available"
      && !roomHasOverlap(reservations, room.code, initial.checkIn, initial.checkOut));
    initial.roomLines[0] = { ...firstLine, roomId: available?.id ?? "", roomNumber: available?.code ?? "" };
    return initial;
  });
  const [businessBlocks] = useLocalStorageState<BusinessBlock[]>(businessBlockStorageKey(propertyId), initialBusinessBlocks, isBusinessBlockArray, (records) => migrateBusinessBlockRecords(records, propertyId, homeCurrency, defaultDate));
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState("");
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState(form.roomLines[0]?.id ?? "");
  const selectedPlan = ratePlans.find((plan) => plan.id === form.ratePlanId);

  function update<K extends keyof ReservationForm>(key: K, value: ReservationForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "bookingSource" && value === "Direct") {
        next.bookingReference = ""; next.tourNumber = ""; next.groupName = "";
      }
      if (key === "status" && value !== "Checked-in") next.checkInNow = false;
      if (key === "checkIn" || key === "nights" || key === "isDayRoom") {
        next.checkOut = next.isDayRoom ? next.checkIn : addDays(next.checkIn, Math.max(Number(next.nights), 1));
      }
      if (key === "checkOut" && !next.isDayRoom) next.nights = Math.max(daysBetween(next.checkIn, String(value)), 1);
      if (key === "email" && !isValidEmail(String(value))) next.sendEmail = false;
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
        const rate = getPlanRate(plan, line.roomTypeId);
        return { ...line, ratePlanId: plan.id, ratePlanName: plan.name, mealPlan: plan.mealPlan, currency: plan.currency,
          originalNightlyRate: rate, effectiveNightlyRate: line.isFoc ? 0 : rate };
      })
    }));
  }

  function updateRoomLine(id: string, patch: Partial<ReservationRoomDraft>) {
    setForm((current) => ({ ...current, roomLines: current.roomLines.map((line) => line.id === id ? { ...line, ...patch } : line) }));
  }

  function availableRooms(line: ReservationRoomDraft) {
    return roomList.filter((room) => room.type === line.roomType && room.status !== "Out of Order" && room.status !== "Maintenance"
      && (room.status === "Available" || Boolean(booking && line.roomNumber === room.code))
      && (!roomHasOverlap(reservations, room.code, form.checkIn, form.isDayRoom ? addDays(form.checkIn, 1) : form.checkOut, booking?.id) || line.roomNumber === room.code)
      && !form.roomLines.some((other) => other.id !== line.id && other.roomNumber === room.code));
  }

  function changeRoomType(line: ReservationRoomDraft, typeName: string) {
    const type = roomTypes.find((item) => item.name === typeName) ?? roomTypes[0];
    const plan = selectedPlan ?? ratePlans[0];
    const rate = plan ? getPlanRate(plan, type.id) : type.baseRate;
    const candidate = roomList.find((room) => room.type === type.name && room.status === "Available"
      && !roomHasOverlap(reservations, room.code, form.checkIn, form.isDayRoom ? addDays(form.checkIn, 1) : form.checkOut, booking?.id)
      && !form.roomLines.some((other) => other.id !== line.id && other.roomNumber === room.code));
    updateRoomLine(line.id, { roomTypeId: type.id, roomType: type.name, roomId: candidate?.id ?? "", roomNumber: candidate?.code ?? "",
      originalNightlyRate: rate, effectiveNightlyRate: line.isFoc ? 0 : rate });
  }

  function addRoomLine() {
    const type = roomTypes[0];
    const plan = selectedPlan ?? ratePlans[0];
    const rate = plan ? getPlanRate(plan, type.id) : type.baseRate;
    const room = roomList.find((item) => item.type === type.name && item.status === "Available" && !form.roomLines.some((line) => line.roomNumber === item.code)
      && !roomHasOverlap(reservations, item.code, form.checkIn, form.isDayRoom ? addDays(form.checkIn, 1) : form.checkOut, booking?.id));
    const line: ReservationRoomDraft = { id: createUuid(), roomTypeId: type.id, roomType: type.name, roomId: room?.id ?? "", roomNumber: room?.code ?? "",
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
    if (!form.isDayRoom && form.checkOut <= form.checkIn) return "Check-out must be after check-in.";
    if (!form.roomLines.length) return "Add at least one room.";
    if (new Set(form.roomLines.map((line) => line.roomNumber)).size !== form.roomLines.length) return "The same physical room cannot be assigned twice.";
    if (!form.businessBlockId) {
      const dates = stayDates(form.checkIn, form.isDayRoom ? addDays(form.checkIn, 1) : form.checkOut);
      const counts = form.roomLines.reduce<Record<string, number>>((result, line) => ({ ...result, [line.roomType]: (result[line.roomType] || 0) + 1 }), {});
      for (const [roomTypeName, requested] of Object.entries(counts)) {
        const capacity = roomTypes.find((type) => type.name === roomTypeName)?.rooms.length || 0;
        for (const date of dates) {
          const available = roomTypeAvailability(roomTypeName, date, capacity, reservations.filter((item) => item.id !== booking?.id), businessBlocks);
          if (requested > available) return `${roomTypeName} has only ${available} sellable room(s) remaining on ${date} after active Business Block holds.`;
        }
      }
    }
    for (const line of form.roomLines) {
      if (!line.roomNumber) return `Select an available room for ${line.roomType}.`;
      const room = roomList.find((item) => item.code === line.roomNumber);
      const savedOnExisting = Boolean(booking && (booking.reservationRooms?.some((item) => item.roomNumber === line.roomNumber) || booking.room === line.roomNumber));
      if (!room || (!savedOnExisting && room.status !== "Available")) return `Room ${line.roomNumber} is not operationally available.`;
      if (line.isFoc && !line.focReason.trim()) return `Enter a complimentary reason for room ${line.roomNumber}.`;
      if (roomHasOverlap(reservations, line.roomNumber, form.checkIn, form.isDayRoom ? addDays(form.checkIn, 1) : form.checkOut, booking?.id)) return `Room ${line.roomNumber} overlaps another active reservation.`;
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
            <SelectField label="Booking Source" value={form.bookingSource} onChange={(value) => update("bookingSource", value)} options={["Direct", "Agoda", "Expedia", "Booking.com", "Travel Agent"]} />
            <InputField label={`Booking Ref.${form.bookingSource === "Direct" ? "" : " *"}`} value={form.bookingReference} onChange={(value) => update("bookingReference", value)} placeholder={form.bookingSource === "Direct" ? "Not required for direct bookings" : "Required external reference"} disabled={form.bookingSource === "Direct"} />
            <InputField label="Tour No" value={form.tourNumber} onChange={(value) => update("tourNumber", value)} placeholder="Tour No" disabled={form.bookingSource === "Direct"} />
            <InputField label="Group Name" value={form.groupName} onChange={(value) => update("groupName", value)} placeholder="Group Name" disabled={form.bookingSource === "Direct"} />
            <SelectField label="Status" value={form.status} onChange={(value) => update("status", value as ReservationStatus)} options={["Confirmed", "Tentative", "Checked-in", "Checked-out", "Cancelled", "No Show", "Blocked"]} />
            <div className="grid gap-1"><label className="text-sm font-semibold">Check-in</label><div className="flex items-center gap-2"><input value={form.checkIn} onChange={(e) => update("checkIn", e.target.value)} type="date" className="focus-ring h-11 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm" /><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isDayRoom} onChange={(e) => update("isDayRoom", e.target.checked)} />Day room</label></div></div>
            <InputField label="Nights" value={String(form.nights)} onChange={(value) => update("nights", Number(value))} type="number" disabled={form.isDayRoom} />
            <InputField label="Check-out" value={form.checkOut} onChange={(value) => update("checkOut", value)} type="date" disabled={form.isDayRoom} />
          </div></section>

          <section className="mt-4 rounded-md bg-slate-50 p-3">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1.2fr]"><div className="flex gap-2"><SelectField label="Rate Plan" value={form.ratePlanId} onChange={selectRatePlan} options={ratePlans.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name }))} /><button type="button" aria-label="Create rate plan" className="mt-7 grid h-11 w-11 place-items-center rounded-md border border-line bg-white" onClick={() => setRateDialogOpen(true)}><Plus className="h-4 w-4" /></button></div>
              <SelectField label="Currency" value={form.currency} onChange={(value) => update("currency", value)} options={[homeCurrency, "USD", "EUR", "GBP"].filter((v, i, a) => a.indexOf(v) === i)} />
              <SelectField label="Meal Plan" value={form.mealPlan} onChange={(value) => update("mealPlan", value)} options={["Room Only", "Bed & Breakfast", "Half Board", "Full Board"]} /></div>
            <p className="mt-2 text-xs text-slate-500">Selecting a rate plan fills currency, meal plan, cancellation terms and room rates. Edited values are treated as overrides.</p>
            <div className="mt-1 flex gap-3 text-xs text-amber-600">{selectedPlan && form.currency !== selectedPlan.currency ? <span>Currency: Custom override</span> : null}{selectedPlan && form.mealPlan !== selectedPlan.mealPlan ? <span>Meal plan: Custom override</span> : null}</div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1120px] text-sm"><thead><tr className="text-left text-slate-500">{["Room Type", "Room No", "Occupancy", "Bed", "Adult", "Child", "Rate", "Complimentary (FOC)", "Edit", ""].map((head, index) => <th key={`${head}-${index}`} className="px-2 py-2">{head}</th>)}</tr></thead>
              <tbody>{form.roomLines.map((line) => { const editable = editingLineId === line.id; const candidates = availableRooms(line); const planRate = selectedPlan ? getPlanRate(selectedPlan, line.roomTypeId) : line.originalNightlyRate; return <tr key={line.id} className="border-t border-line">
                <td className="px-2 py-2"><select disabled={!editable} value={line.roomType} onChange={(e) => changeRoomType(line, e.target.value)} className="h-10 w-full rounded-md border border-line bg-white px-2 disabled:bg-slate-100">{roomTypes.map((type) => <option key={type.id}>{type.name}</option>)}</select></td>
                <td className="px-2 py-2"><select disabled={!editable} value={line.roomNumber} onChange={(e) => { const room = roomList.find((item) => item.code === e.target.value); updateRoomLine(line.id, { roomNumber: e.target.value, roomId: room?.id ?? "" }); }} className="h-10 w-full rounded-md border border-line bg-white px-2 disabled:bg-slate-100"><option value="">Select</option>{candidates.map((room) => <option key={room.id} value={room.code}>{room.code}</option>)}</select></td>
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
      {rateDialogOpen ? <RatePlanDialog propertyId={propertyId} homeCurrency={homeCurrency} onClose={() => setRateDialogOpen(false)} onCreate={(plan) => { setRatePlans((current) => [...current, plan]); if (plan.active) applyRatePlan(plan); setRateDialogOpen(false); }} /> : null}
    </div>
  );
}

function stayDates(start: string, end: string) { const dates: string[] = []; const date = new Date(`${start}T00:00:00`); const last = new Date(`${end}T00:00:00`); while (date < last) { dates.push(date.toISOString().slice(0, 10)); date.setDate(date.getDate() + 1); } return dates; }

function RatePlanDialog({ propertyId, homeCurrency, onClose, onCreate }: { propertyId: string; homeCurrency: string; onClose: () => void; onCreate: (plan: RatePlan) => void }) {
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
      name: name.trim(), currency, mealPlan, baseRate, roomTypeRates, refundable,
      cancellationPolicy: policy, active, isCustom: true
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
