"use client";

import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { BedDouble, ClipboardList, Paperclip, UserRound, X } from "lucide-react";
import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import type { Reservation, ReservationRoom, ReservationStatus } from "@/app/data/pms-data";
import { currentSessionUser } from "@/app/lib/current-user";
import { createUuid } from "@/app/lib/record-ids";
import {
  appendReservationLog,
  createReservationLogEntry,
  isReservationAttachmentArray,
  isReservationLogArray,
  logsForReservation,
  readReservationAttachmentMetadata,
  reservationAttachmentStorageKey,
  reservationLogStorageKey,
  type ReservationAttachmentMetadata,
  type ReservationLogEntry
} from "@/app/lib/reservation-activity-repository";
import { statusPillClass } from "../constants";
import { daysBetween } from "../utils";
import { IconButton } from "./controls";
import { ReservationRoomingList } from "./reservation-rooming-list";
import { ReservationEmailActions } from "./reservation-email-actions";

type DetailTab = "Overview" | "Rooms" | "Guests" | "Financials" | "Rooming List" | "Attachments" | "Log";

type ReservationDetailDrawerProps = {
  propertyId: string;
  booking: Reservation;
  onClose: () => void;
  onEdit: (booking: Reservation) => void;
  onRetryEmail: () => Promise<void>;
  onSendReminder?: () => Promise<boolean>;
  onSendGeneral?: (to: string, subject: string, message: string) => Promise<boolean>;
  onUpdateReservation: (booking: Reservation) => void;
  setToast: (message: string) => void;
};

const detailTabs: DetailTab[] = ["Overview", "Rooms", "Guests", "Financials", "Rooming List", "Attachments", "Log"];

export function ReservationDetailDrawer(props: ReservationDetailDrawerProps) {
  const { propertyId, booking, onClose, onEdit, onRetryEmail, onSendReminder, onSendGeneral, onUpdateReservation, setToast } = props;
  const [activeTab, setActiveTab] = useState<DetailTab>("Overview");
  const [documentCategory, setDocumentCategory] = useState("Voucher");
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [attachments, setAttachments] = useLocalStorageState<ReservationAttachmentMetadata[]>(
    reservationAttachmentStorageKey(propertyId),
    () => readReservationAttachmentMetadata(propertyId, booking.id),
    isReservationAttachmentArray
  );
  const [logs, setLogs] = useLocalStorageState<ReservationLogEntry[]>(reservationLogStorageKey(propertyId), [], isReservationLogArray);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currency = booking.currency || "Currency unavailable";
  const paid = Math.min(booking.total, booking.paid);
  const remaining = Math.max(booking.total - paid, 0);
  const rooms = useMemo(() => reservationRooms(booking), [booking]);
  const reservationAttachments = attachments.filter((item) => item.reservationId === booking.id);
  const reservationLogs = logsForReservation(logs, booking.id);
  const statusClass = statusPillClass[booking.status as ReservationStatus] ?? "bg-slate-400";

  function appendLog(action: string, description: string) {
    const entry = createReservationLogEntry({ propertyId, reservationId: booking.id, action, description, createdBy: currentSessionUser.name });
    setLogs((current) => appendReservationLog(current, entry));
  }

  async function copyReference() {
    const reference = booking.bookingReference || booking.bookingRef;
    if (!reference) { setToast("Booking reference is empty"); return; }
    try { await navigator.clipboard.writeText(reference); setToast("Booking reference copied"); }
    catch { setToast("Clipboard access is unavailable"); }
  }

  function handleAttachmentSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    // File objects and Base64 contents are intentionally never persisted.
    const added: ReservationAttachmentMetadata[] = files.map((file) => ({
      id: createUuid(), propertyId, reservationId: booking.id, fileName: file.name,
      fileType: file.type || file.name.split(".").pop()?.toUpperCase() || "FILE", fileSize: file.size,
      documentCategory, description: attachmentDescription.trim(), uploadedBy: currentSessionUser.name, uploadedAt: new Date().toISOString()
    }));
    setAttachments((current) => [...added, ...current]);
    added.forEach((item) => appendLog("Attachment added", `${item.documentCategory} metadata added for ${item.fileName}.`));
    event.currentTarget.value = "";
    setAttachmentDescription("");
    setToast(`${files.length} attachment metadata record${files.length === 1 ? "" : "s"} added locally`);
  }

  function deleteAttachment(attachment: ReservationAttachmentMetadata) {
    if (!window.confirm(`Remove attachment metadata for ${attachment.fileName}?`)) return;
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    appendLog("Attachment deleted", `Attachment metadata removed for ${attachment.fileName}.`);
  }

  function updateRoomingList(next: Reservation, action: string, description: string) {
    onUpdateReservation(next);
    appendLog(action, description);
  }

  return <div className="fixed inset-0 z-50 bg-black/40">
    <aside className="ml-auto flex h-full w-full max-w-[720px] flex-col bg-white shadow-2xl">
      <header className="border-b border-line px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-500 font-semibold text-white">{booking.guest.charAt(0).toUpperCase() || "G"}</span><div className="min-w-0"><h2 className="truncate text-xl font-semibold">{booking.guest}</h2><p className="text-sm text-slate-500">Reservation {booking.resNo}</p><span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${statusClass}`}>{booking.status}</span><p className="mt-1 text-sm text-slate-600">{rooms.length} room{rooms.length === 1 ? "" : "s"}: {rooms.map((room) => room.roomNumber || "Unassigned").join(", ")}</p></div></div>
          <IconButton label="Close reservation details" onClick={onClose}><X className="h-5 w-5" /></IconButton>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold">{booking.isDayRoom ? "Day room" : "Overnight reservation"}</span><div className="flex gap-2"><button type="button" className="rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => void copyReference()}>Copy reference</button><button type="button" className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={() => onEdit(booking)}>Edit reservation</button></div></div>
        <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs"><span>Email request: <b>{booking.emailStatus?.replaceAll("_", " ") ?? "not requested"}</b>{booking.emailFailureMessage ? ` - ${booking.emailFailureMessage}` : ""}</span>{booking.emailStatus === "failed" ? <button type="button" className="font-semibold text-blue-700" onClick={() => void onRetryEmail()}>Retry email</button> : null}</div>
        {onSendReminder && onSendGeneral ? <ReservationEmailActions booking={booking} onReminder={onSendReminder} onGeneral={onSendGeneral} /> : null}
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex overflow-x-auto rounded-md bg-slate-100 p-1 text-center text-sm font-semibold text-slate-500">{detailTabs.map((item) => <button key={item} type="button" onClick={() => setActiveTab(item)} className={`shrink-0 rounded px-3 py-3 ${activeTab === item ? "bg-white text-ink shadow-sm" : "hover:text-ink"}`}>{item}</button>)}</div>

        {activeTab === "Overview" ? <><FinancialSummary currency={currency} total={booking.total} paid={paid} remaining={remaining} /><DetailSection title="Reservation Details" icon={<ClipboardList className="h-4 w-4" />}><DetailGrid items={[
          ["Reservation No", emptyValue(booking.resNo, "No reservation number")], ["Booking Reference", emptyValue(booking.bookingReference || booking.bookingRef, "No booking reference")], ["Booking Source", emptyValue(booking.bookingSource || booking.source, "No booking source")], ["Created By", emptyValue(booking.createdBy, "Unknown creator")], ["Created Date / Time", formatTimestamp(booking.createdAt)], ["Check-in", formatDate(booking.checkIn)], ["Check-out", formatDate(booking.checkOut)], ["Status", booking.status], ["Room Use", booking.isDayRoom ? "Day room" : "Overnight"], ["Currency", currency], ["Rate Plan", emptyValue(booking.ratePlanName, "No rate plan")], ["Meal Plan", emptyValue(booking.mealPlan, "No meal plan")], ["Tour Number", emptyValue(booking.tourNumber, "No tour number")], ["Group Name", emptyValue(booking.groupName, "No group name")]
        ]} /></DetailSection><Remarks booking={booking} /></> : null}

        {activeTab === "Rooms" ? <DetailSection title="Reservation Rooms" icon={<BedDouble className="h-4 w-4" />}><div className="space-y-3">{rooms.map((room) => <RoomCard key={room.id} room={room} reservationCurrency={currency} booking={booking} />)}</div></DetailSection> : null}

        {activeTab === "Guests" ? <><DetailSection title="Primary Guest" icon={<UserRound className="h-4 w-4" />}><DetailGrid items={[["Title", emptyValue(booking.guestTitle, "No title")], ["Name", booking.guest], ["Country", emptyValue(booking.country, "No country")], ["Phone", emptyValue(booking.phone === "-" ? "" : booking.phone, "No phone")], ["Email", emptyValue(booking.email === "-" ? "" : booking.email, "No email")], ["Adults / Children", `${booking.adults} / ${booking.children}`]]} /></DetailSection><Remarks booking={booking} /></> : null}

        {activeTab === "Financials" ? <><FinancialSummary currency={currency} total={booking.total} paid={paid} remaining={remaining} /><p className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-600">Payment posting is not implemented. These values come directly from the saved reservation.</p></> : null}

        {activeTab === "Rooming List" ? <DetailSection title="Reservation Rooming List" icon={<UserRound className="h-4 w-4" />}><ReservationRoomingList booking={booking} onUpdate={updateRoomingList} setToast={setToast} /></DetailSection> : null}

        {activeTab === "Attachments" ? <DetailSection title="Attachment Metadata" icon={<Paperclip className="h-4 w-4" />}>
          <p className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Upload supporting reservation documents such as OTA or travel-agent vouchers, payment receipts, company authorization letters, rooming lists and signed forms. Do not upload card numbers, CVV codes or unnecessary sensitive information.</p>
          <label className="mb-3 grid gap-1 text-sm font-semibold">Document category<select value={documentCategory} onChange={(event) => setDocumentCategory(event.target.value)} className="h-10 rounded-md border border-line bg-white px-3 font-normal"><option>Voucher</option><option>Payment receipt</option><option>Authorization letter</option><option>Rooming list</option><option>Signed form</option><option>Other</option></select></label>
          <label className="mb-3 grid gap-1 text-sm font-semibold">Description<textarea value={attachmentDescription} onChange={(event) => setAttachmentDescription(event.target.value)} rows={3} placeholder="Describe the document and why it belongs to this reservation" className="rounded-md border border-line bg-white px-3 py-2 font-normal" /></label>
          <input ref={fileInputRef} type="file" multiple onChange={handleAttachmentSelected} className="hidden" /><button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">Choose files</button>
          <p className="mt-2 text-xs text-slate-500">Only metadata is stored locally. Actual file contents require Supabase Storage later and are never stored as Base64 in localStorage.</p>
          <div className="mt-4 space-y-2">{reservationAttachments.map((attachment) => <div key={attachment.id} className="flex items-start justify-between gap-4 rounded-md border border-line p-3 text-sm"><div><p className="font-semibold">{attachment.fileName}</p><p className="text-xs text-slate-500">{attachment.documentCategory} · {attachment.fileType} · {formatFileSize(attachment.fileSize)} · {formatTimestamp(attachment.uploadedAt)} · {attachment.uploadedBy}</p><p className="mt-2 whitespace-pre-wrap text-slate-600">{attachment.description?.trim() || "No attachment description"}</p></div><button type="button" className="shrink-0 text-xs font-semibold text-red-600" onClick={() => deleteAttachment(attachment)}>Remove</button></div>)}{!reservationAttachments.length ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No attachment metadata</p> : null}</div>
        </DetailSection> : null}

        {activeTab === "Log" ? <DetailSection title="Append-only Prototype Log" icon={<ClipboardList className="h-4 w-4" />}><p className="mb-3 text-xs text-slate-500">This localStorage timeline is append-only in the UI, but it is not production audit immutability.</p><div className="space-y-3">{reservationLogs.map((entry) => <article key={entry.id} className="rounded-md border border-line p-3 text-sm"><div className="flex justify-between gap-3"><b>{entry.action}</b><time className="text-xs text-slate-500">{formatTimestamp(entry.createdAt)}</time></div><p className="mt-2 text-slate-600">{entry.description}</p><p className="mt-2 text-xs text-slate-500">By {entry.createdBy}</p>{entry.changes && Object.keys(entry.changes).length ? <dl className="mt-2 rounded bg-slate-50 p-2 text-xs">{Object.entries(entry.changes).map(([field, change]) => <div key={field} className="mt-1"><b>{field}:</b> {displayChange(change.from)} → {displayChange(change.to)}</div>)}</dl> : null}</article>)}</div>{!reservationLogs.length ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No log entries yet</p> : null}</DetailSection> : null}
      </div>
    </aside>
  </div>;
}

function reservationRooms(booking: Reservation): ReservationRoom[] {
  if (booking.reservationRooms?.length) return booking.reservationRooms;
  const timestamp = booking.createdAt || new Date(0).toISOString();
  return [{ id: `${booking.id}-legacy-room`, propertyId: booking.propertyId || "", reservationId: booking.id, roomTypeId: "", roomType: booking.roomType, roomId: booking.room, roomNumber: booking.room, occupancy: "Unspecified", bedType: "Unspecified", adults: booking.adults, children: booking.children, ratePlanId: booking.ratePlanId || "", ratePlanName: booking.ratePlanName || "", mealPlan: booking.mealPlan || "", currency: booking.currency || "", originalNightlyRate: booking.total, effectiveNightlyRate: booking.total, isFoc: false, focReason: "", requiresManagerApproval: false, createdAt: timestamp, updatedAt: booking.updatedAt || timestamp }];
}

function RoomCard({ room, reservationCurrency, booking }: { room: ReservationRoom; reservationCurrency: string; booking: Reservation }) {
  const currency = room.currency || reservationCurrency;
  const nights = booking.isDayRoom ? 1 : Math.max(daysBetween(booking.checkIn, booking.checkOut), 1);
  return <div className={`rounded-md border p-4 text-sm ${room.isFoc ? "border-amber-300 bg-amber-50" : "border-line bg-slate-50"}`}><div className="flex flex-wrap justify-between gap-3"><div><b>{room.roomType}</b><p className="text-slate-500">Room {room.roomNumber || "Unassigned"}</p></div><b>{formatMoney(room.effectiveNightlyRate, currency)} / night</b></div><div className="mt-3 grid grid-cols-2 gap-2 text-slate-600 sm:grid-cols-4"><span>{room.occupancy}</span><span>{room.bedType}</span><span>{room.adults} adult(s)</span><span>{room.children} child(ren)</span></div><p className="mt-3 text-slate-600">{nights} chargeable night{nights === 1 ? "" : "s"} · {room.mealPlan || "No meal plan"} · {room.ratePlanName || "No rate plan"}</p>{room.isFoc ? <p className="mt-2 text-amber-700">Complimentary (FOC): {room.focReason || "No FOC reason"}. Original rate {formatMoney(room.originalNightlyRate, currency)}.</p> : null}</div>;
}

function FinancialSummary({ currency, total, paid, remaining }: { currency: string; total: number; paid: number; remaining: number }) {
  return <section className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4"><h3 className="font-semibold">Reservation Financials</h3><div className="mt-4 grid grid-cols-3 gap-3"><MoneyTile label="Total" value={total} currency={currency} tone="blue" /><MoneyTile label="Paid" value={paid} currency={currency} tone="emerald" /><MoneyTile label="Remaining" value={remaining} currency={currency} tone="amber" /></div></section>;
}

function Remarks({ booking }: { booking: Reservation }) { return <DetailSection title="Remarks"><RemarkCard title="Reservation Remarks" value={booking.reservationRemarks} empty="No reservation remarks" /><RemarkCard title="Guest Remarks" value={booking.guestRemarks} empty="No guest remarks" /><RemarkCard title="Internal Remarks · Staff only" value={booking.internalRemarks} empty="No internal remarks" tone="amber" /></DetailSection>; }
function RemarkCard({ title, value, empty, tone }: { title: string; value?: string; empty: string; tone?: "amber" }) { return <div className={`mt-3 rounded-md border p-3 text-sm ${tone === "amber" ? "border-amber-200 bg-amber-50" : "border-line bg-slate-50"}`}><b>{title}</b><p className="mt-2 whitespace-pre-wrap text-slate-600">{value?.trim() || empty}</p></div>; }
function DetailSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) { return <section className="mt-6 border-t border-line pt-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500">{icon}{title}</h3>{children}</section>; }
function DetailGrid({ items }: { items: Array<[string, string]> }) { return <dl className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">{items.map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-700">{value}</dd></div>)}</dl>; }
function MoneyTile({ label, value, currency, tone }: { label: string; value: number; currency: string; tone: "blue" | "emerald" | "amber" }) { const tones = { blue: "border-blue-200 text-blue-700", emerald: "border-emerald-200 text-emerald-600", amber: "border-amber-200 text-orange-500" }; return <div className={`rounded-md border bg-white p-3 text-xs ${tones[tone]}`}><p className="text-slate-500">{label}</p><p className="mt-2 font-semibold">{formatMoney(value, currency)}</p></div>; }
function emptyValue(value: string | undefined, empty: string) { return value?.trim() || empty; }
function formatMoney(value: number, currency: string) { return `${currency} ${Number(value || 0).toFixed(2)}`; }
function formatDate(value: string) { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value || "Unknown date" : new Intl.DateTimeFormat("en-LK", { dateStyle: "medium" }).format(date); }
function formatTimestamp(value: string | undefined) { if (!value) return "Unknown date and time"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Unknown date and time" : new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatFileSize(size: number) { if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`; return `${(size / 1024 / 1024).toFixed(1)} MB`; }
function displayChange(value: unknown) { if (value === undefined || value === null || value === "") return "Empty"; if (typeof value === "object") return JSON.stringify(value); return String(value); }
