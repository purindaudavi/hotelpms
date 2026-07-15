"use client";

import { useMemo, useState } from "react";
import { Download, Eye, Pencil, Plus, RefreshCw, Share2 } from "lucide-react";
import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { roomTypes, type Reservation } from "@/app/data/pms-data";
import {
  allocationMetrics,
  appendBusinessBlockLog,
  businessBlockLogStorageKey,
  businessBlockMetrics,
  businessBlockStorageKey,
  createBusinessBlock,
  createBusinessBlockLog,
  isBusinessBlockArray,
  isBusinessBlockLogArray,
  migrateBusinessBlockRecords,
  releaseRemainingAllocations,
  updateBusinessBlock,
  validateBlockActivation
} from "@/app/lib/business-block-repository";
import { currentSessionUser } from "@/app/lib/current-user";
import { createUuid } from "@/app/lib/record-ids";
import { ReservationDetailDrawer } from "../../front-desk/components/reservation-detail-drawer";
import { ReservationEditor } from "../../front-desk/components/reservation-editor";
import type { ReservationForm } from "../../front-desk/types";
import { useReservationActions } from "../../front-desk/use-reservation-actions";
import { useReservationEditorResources } from "../../front-desk/use-reservation-editor-resources";
import { initialBusinessBlocks } from "../constants";
import type { BookingTab, BusinessBlock, BusinessBlockAllocation, BusinessBlockLogEntry, BusinessBlockStatus, ReservationModuleProps } from "../types";
import { copyToClipboard, dateInRange, exportCsv, searchReservation } from "../utils";
import { EmptyState, Field, Panel, ReservationPageFrame, SearchBox, SegmentedTabs, SelectInput, StatusPill, TextInput, ToolbarButton } from "../components/reservation-ui";
import { BusinessBlockForm } from "./business-block-form";
import { BusinessBlockDetailDrawer } from "./business-block-detail-drawer";

export function BookingsPage(props: ReservationModuleProps) {
  const { propertyId, reservations, setReservations, roomList, setRoomList, setToast } = props;
  const { businessDate, homeCurrency, ratePlans, setRatePlans } = useReservationEditorResources(propertyId);
  const reservationActions = useReservationActions({ propertyId, businessDate, reservations, setReservations, roomList, setRoomList, ratePlans, setToast });
  const [blocks, setBlocks] = useLocalStorageState<BusinessBlock[]>(businessBlockStorageKey(propertyId), initialBusinessBlocks, isBusinessBlockArray, (records) => migrateBusinessBlockRecords(records, propertyId, homeCurrency, businessDate));
  const [blockLogs, setBlockLogs] = useLocalStorageState<BusinessBlockLogEntry[]>(businessBlockLogStorageKey(propertyId), [], isBusinessBlockLogArray);
  const [tab, setTab] = useState<BookingTab>("reservations");
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"checkIn" | "checkOut" | "reservationDate">("checkIn");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAll, setShowAll] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [reservationPrefill, setReservationPrefill] = useState<ReservationForm | null>(null);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockFormOpen, setBlockFormOpen] = useState(false);

  const editingBooking = reservations.find((booking) => booking.id === editingBookingId) ?? null;
  const selectedBooking = reservations.find((booking) => booking.id === selectedBookingId) ?? null;
  const editingBlock = blocks.find((block) => block.id === editingBlockId) ?? null;
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;
  const filteredReservations = useMemo(() => reservations.filter((booking) => searchReservation(booking, query) && (showAll || booking.checkIn >= businessDate) && (!(dateFrom || dateTo) || dateInRange(booking[dateFilter], dateFrom, dateTo))).sort((a, b) => b.reservationDate.localeCompare(a.reservationDate) || b.resNo.localeCompare(a.resNo)), [businessDate, dateFilter, dateFrom, dateTo, query, reservations, showAll]);
  const filteredBlocks = useMemo(() => blocks.filter((block) => {
    const searchable = [block.blockNumber, block.blockName, block.companyName, block.contactName, block.status].join(" ").toLowerCase();
    if (!searchable.includes(query.toLowerCase())) return false;
    if (statusFilter !== "All" && block.status !== statusFilter) return false;
    if (dateFrom && block.checkOut < dateFrom) return false;
    if (dateTo && block.checkIn > dateTo) return false;
    return true;
  }).sort((a, b) => b.checkIn.localeCompare(a.checkIn)), [blocks, dateFrom, dateTo, query, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / rowsPerPage));
  const visibleRows = filteredReservations.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  function appendBlockLog(blockId: string, action: string, description: string) {
    const entry = createBusinessBlockLog(propertyId, blockId, action, description, currentSessionUser.name);
    setBlockLogs((current) => appendBusinessBlockLog(current, entry));
  }
  function resetFilters() { setQuery(""); setDateFrom(""); setDateTo(""); setStatusFilter("All"); setShowAll(true); setPage(1); setToast("Booking filters reset"); }
  function openReservationEditor(booking: Reservation | null = null) { setEditingBookingId(booking?.id ?? null); setReservationPrefill(null); setSelectedBookingId(null); setReservationModalOpen(true); }
  function closeReservationEditor() { setReservationModalOpen(false); setEditingBookingId(null); setReservationPrefill(null); }
  async function saveReservation(form: ReservationForm) {
    if (form.businessBlockId && form.businessBlockAllocationId) {
      const block = blocks.find((item) => item.id === form.businessBlockId);
      const allocation = block?.allocations.find((item) => item.id === form.businessBlockAllocationId);
      if (!block || block.status !== "Active" || !allocation) return { ok: false as const, error: "The linked Business Block allocation is no longer active." };
      const existing = reservations.find((item) => item.id === form.id);
      const requested = form.roomLines.length;
      const alreadyPicked = existing?.businessBlockId === block.id ? existing.reservationRooms?.length ?? existing.rooms : 0;
      if (requested - alreadyPicked > allocationMetrics(allocation, reservations).remaining) return { ok: false as const, error: "This Business Block allocation does not have enough remaining rooms." };
    }
    const result = await reservationActions.saveReservation(form);
    if (!result.ok) return result;
    if (form.businessBlockId) appendBlockLog(form.businessBlockId, form.id ? "Linked reservation updated" : "Reservation linked", `${result.reservation.resNo} is linked to this block.`);
    closeReservationEditor(); setSelectedBookingId(result.reservation.id); return { ok: true as const };
  }
  function removeReservation(bookingId: string) { const booking = reservations.find((item) => item.id === bookingId); reservationActions.removeReservation(bookingId); if (booking?.businessBlockId) appendBlockLog(booking.businessBlockId, "Linked reservation removed", `${booking.resNo} was removed; its picked-up rooms returned to Remaining.`); setSelectedBookingId(null); closeReservationEditor(); }

  function saveBlock(block: BusinessBlock) {
    const existing = blocks.find((item) => item.id === block.id);
    let savedBlock = block;
    if ((block.status === "Released" || block.status === "Cancelled") && existing?.status !== block.status) {
      savedBlock = { ...releaseRemainingAllocations(block, reservations), status: block.status };
    }
    if (savedBlock.status === "Active") {
      const error = validateBlockActivation(savedBlock, blocks, reservations, Object.fromEntries(roomTypes.map((type) => [type.name, type.rooms.length])));
      if (error) return error;
    }
    try {
      setBlocks((current) => existing ? updateBusinessBlock(current, savedBlock) : createBusinessBlock(current, savedBlock));
      appendBlockLog(savedBlock.id, existing ? "Block edited" : "Block created", existing ? `${savedBlock.blockNumber} details and allocations were updated.` : `${savedBlock.blockNumber} was created as ${savedBlock.status}.`);
      if (existing && existing.status !== savedBlock.status) appendBlockLog(savedBlock.id, "Status changed", `${existing.status} changed to ${savedBlock.status}.`);
      if (existing && JSON.stringify(existing.allocations) !== JSON.stringify(savedBlock.allocations)) appendBlockLog(savedBlock.id, "Allocations changed", "Room-type allocation details were added, edited or removed.");
      setBlockFormOpen(false); setEditingBlockId(null); setSelectedBlockId(savedBlock.id); setToast(`Business block ${existing ? "updated" : "created"} locally`);
    } catch (error) { return error instanceof Error ? error.message : "Business block could not be saved."; }
  }
  function changeBlockStatus(block: BusinessBlock, status: BusinessBlockStatus) {
    if (status === "Active") { const error = validateBlockActivation(block, blocks, reservations, Object.fromEntries(roomTypes.map((type) => [type.name, type.rooms.length]))); if (error) { setToast(error); return; } }
    if (status === "Cancelled" && !window.confirm("Cancel this block? Linked reservations will remain unchanged.")) return;
    let next = { ...block, status, updatedAt: new Date().toISOString() };
    if (status === "Released" || status === "Cancelled") { const released = releaseRemainingAllocations(block, reservations); next = { ...released, status }; }
    setBlocks((current) => updateBusinessBlock(current, next)); appendBlockLog(block.id, "Status changed", `${block.status} changed to ${status}.${status === "Released" || status === "Cancelled" ? " Unpicked rooms returned to normal availability; linked reservations were kept." : ""}`); setToast(`Business block changed to ${status}`);
  }
  function releaseBlock(block: BusinessBlock) { if (!window.confirm("Release all unpicked rooms? Linked reservations will remain unchanged.")) return; changeBlockStatus(block, "Released"); }
  function createReservationFromBlock(block: BusinessBlock, allocation: BusinessBlockAllocation) {
    const metrics = allocationMetrics(allocation, reservations); if (block.status !== "Active" || metrics.remaining < 1) { setToast("This allocation has no rooms available for pickup"); return; }
    const now = new Date().toISOString(); const type = roomTypes.find((item) => item.id === allocation.roomTypeId) ?? roomTypes[0];
    const prefill: ReservationForm = { businessBlockId: block.id, businessBlockAllocationId: allocation.id, title: "Select", bookingSource: "Travel Agent", bookingReference: block.blockNumber, tourNumber: "", groupName: block.blockName, status: "Confirmed", checkIn: block.checkIn, checkOut: block.checkOut, nights: Math.max(Math.round((new Date(`${block.checkOut}T00:00:00`).getTime() - new Date(`${block.checkIn}T00:00:00`).getTime()) / 86_400_000), 1), isDayRoom: false, ratePlanId: allocation.ratePlanId || ratePlans[0]?.id || "", currency: allocation.currency, mealPlan: allocation.mealPlan, refundable: true, cancellationPolicy: block.cancellationPolicy || "", roomLines: [{ id: createUuid(), roomTypeId: type.id, roomType: type.name, roomId: "", roomNumber: "", occupancy: "Double", bedType: "Bed Type", adults: Math.min(type.maxAdults, 2), children: 0, ratePlanId: allocation.ratePlanId || "", ratePlanName: allocation.ratePlanName || "", mealPlan: allocation.mealPlan, currency: allocation.currency, originalNightlyRate: allocation.negotiatedRate, effectiveNightlyRate: allocation.isComplimentary ? 0 : allocation.negotiatedRate, isFoc: allocation.isComplimentary, focReason: allocation.complimentaryReason || "", requiresManagerApproval: allocation.isComplimentary, businessBlockAllocationId: allocation.id, createdAt: now, updatedAt: now }], guest: "", phone: "", email: "", country: "Select Country", reservationRemarks: block.blockRemarks || "", guestRemarks: "", internalRemarks: block.internalRemarks || "", checkInNow: false, sendEmail: false };
    setReservationPrefill(prefill); setEditingBookingId(null); setSelectedBlockId(null); setReservationModalOpen(true);
  }

  function exportBookings() { exportCsv("reservations.csv", filteredReservations.map((booking) => ({ "Res No": booking.resNo, "Booking Ref": booking.bookingReference || booking.bookingRef || "", "Reservation Date": booking.reservationDate, "Check-In": booking.checkIn, "Check-Out": booking.checkOut, "No. of Rooms": booking.rooms, "Booking Source": booking.bookingSource || booking.source, Status: booking.status, "Booker Name": booking.guest, Phone: booking.phone, Email: booking.email, Country: booking.country, Currency: booking.currency || homeCurrency, Total: booking.total, Paid: booking.paid }))); setToast("Reservations CSV exported"); }
  function exportBlocks() { exportCsv("business-blocks.csv", filteredBlocks.map((block) => { const metrics = businessBlockMetrics(block, reservations); return { "Block No": block.blockNumber, "Block Name": block.blockName, Company: block.companyName, "Stay Dates": `${block.checkIn} - ${block.checkOut}`, Blocked: metrics.blocked, Picked: metrics.pickedUp, Remaining: metrics.remaining, "Cut-off": block.cutoffDate, Status: block.status }; })); setToast("Business blocks CSV exported"); }

  return <ReservationPageFrame>
    <div className="flex flex-wrap items-start justify-between gap-4"><h1 className="text-2xl font-semibold">Bookings</h1><div className="flex flex-wrap gap-2">{tab === "reservations" ? <ToolbarButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={() => openReservationEditor()}>Reservation</ToolbarButton> : <ToolbarButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditingBlockId(null); setBlockFormOpen(true); }}>Business Block</ToolbarButton>}<ToolbarButton tone="dark" icon={<Share2 className="h-4 w-4" />} onClick={() => void copyToClipboard(window.location.href).then((copied) => setToast(copied ? "Bookings link copied" : "Clipboard unavailable"))}>Share</ToolbarButton><ToolbarButton tone="dark" icon={<Download className="h-4 w-4" />} onClick={tab === "reservations" ? exportBookings : exportBlocks}>Export CSV</ToolbarButton></div></div>
    <div className="grid gap-4 xl:grid-cols-[360px_1fr_220px_220px_160px_140px]"><div className="self-end"><SegmentedTabs tabs={[{ label: "Reservations", value: "reservations" }, { label: "Business Blocks", value: "business-blocks" }]} value={tab} onChange={(next) => { setTab(next); setPage(1); }} className="w-full" /></div><Field label="Search"><SearchBox value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search..." /></Field>{tab === "reservations" ? <Field label="Date Filter Type"><SelectInput value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}><option value="checkIn">Check-In</option><option value="checkOut">Check-Out</option><option value="reservationDate">Reservation Date</option></SelectInput></Field> : <Field label="Status"><SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{["All", "Tentative", "Active", "Released", "Cancelled", "Completed"].map((status) => <option key={status}>{status}</option>)}</SelectInput></Field>}<Field label="Date From"><TextInput type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></Field><Field label="Date To"><TextInput type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></Field><div className="flex items-end gap-2">{tab === "reservations" ? <label className="flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold"><input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />Show all</label> : null}<ToolbarButton icon={<RefreshCw className="h-4 w-4" />} onClick={resetFilters}>Reset</ToolbarButton></div></div>

    {tab === "reservations" ? <ReservationsTable rows={visibleRows} onOpen={(id) => setSelectedBookingId(id)} /> : <BusinessBlocksTable blocks={filteredBlocks} reservations={reservations} businessDate={businessDate} onOpen={(id) => setSelectedBlockId(id)} onEdit={(id) => { setEditingBlockId(id); setBlockFormOpen(true); }} onStatus={(block, status) => changeBlockStatus(block, status)} onRelease={releaseBlock} />}
    {tab === "reservations" ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><div className="flex items-center gap-3">Show<SelectInput value={rowsPerPage} onChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(1); }} className="w-24">{[10, 25, 50].map((size) => <option key={size}>{size}</option>)}</SelectInput>per page</div><div className="flex items-center gap-3"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-4 py-2 disabled:opacity-50">Previous</button><span className="rounded bg-slate-950 px-4 py-2 font-semibold text-white">Page {page} of {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border px-4 py-2 disabled:opacity-50">Next</button></div></div> : null}

    {reservationModalOpen ? <ReservationEditor propertyId={propertyId} booking={editingBooking} initialForm={reservationPrefill} reservations={reservations} roomList={roomList} ratePlans={ratePlans} setRatePlans={setRatePlans} homeCurrency={homeCurrency} defaultDate={businessDate} onClose={closeReservationEditor} onSave={saveReservation} onDelete={removeReservation} setToast={setToast} /> : null}
    {selectedBooking ? <ReservationDetailDrawer key={selectedBooking.id} propertyId={propertyId} booking={selectedBooking} onClose={() => setSelectedBookingId(null)} onEdit={openReservationEditor} onRetryEmail={() => reservationActions.deliverEmail(selectedBooking).then(() => undefined)} onUpdateReservation={(booking) => setReservations((current) => current.map((item) => item.id === booking.id ? booking : item))} setToast={setToast} /> : null}
    {blockFormOpen ? <BusinessBlockForm propertyId={propertyId} businessDate={businessDate} homeCurrency={homeCurrency} ratePlans={ratePlans} block={editingBlock} reservations={reservations} onClose={() => { setBlockFormOpen(false); setEditingBlockId(null); }} onSave={saveBlock} /> : null}
    {selectedBlock ? <BusinessBlockDetailDrawer block={selectedBlock} reservations={reservations} logs={blockLogs} onClose={() => setSelectedBlockId(null)} onEdit={() => { setEditingBlockId(selectedBlock.id); setBlockFormOpen(true); }} onStatus={(status) => changeBlockStatus(selectedBlock, status)} onRelease={() => releaseBlock(selectedBlock)} onCreateReservation={(allocation) => createReservationFromBlock(selectedBlock, allocation)} onOpenReservation={(id) => { setSelectedBlockId(null); setSelectedBookingId(id); }} setToast={setToast} /> : null}
  </ReservationPageFrame>;
}

function ReservationsTable({ rows, onOpen }: { rows: Reservation[]; onOpen: (id: string) => void }) { return <Panel title="Bookings" bodyClassName="p-0"><div className="overflow-x-auto"><table className="min-w-[1700px] text-left text-sm"><thead><tr className="border-b border-line text-slate-500">{["Res No", "Booking Ref", "Reservation Date", "Check-In", "Check-Out", "No. of Rooms", "Booking Source", "Status", "Booker Name", "Phone", "Email", "Country", "Currency"].map((heading) => <th key={heading} className="px-5 py-4 font-semibold">{heading}</th>)}</tr></thead><tbody>{rows.map((booking) => <tr key={booking.id} onDoubleClick={() => onOpen(booking.id)} title="Double-click to open reservation details" className="cursor-pointer border-b border-line hover:bg-slate-50"><td className="px-5 py-3 font-medium">{booking.resNo}</td><td className="px-5 py-3">{booking.bookingReference || booking.bookingRef || "No booking reference"}</td><td className="px-5 py-3">{booking.reservationDate}</td><td className="px-5 py-3">{booking.checkIn}</td><td className="px-5 py-3">{booking.checkOut}</td><td className="px-5 py-3">{booking.rooms}</td><td className="px-5 py-3">{booking.bookingSource || booking.source}</td><td className="px-5 py-3"><StatusPill status={booking.status} /></td><td className="px-5 py-3">{booking.guest}</td><td className="px-5 py-3">{booking.phone}</td><td className="px-5 py-3">{booking.email}</td><td className="px-5 py-3">{booking.country}</td><td className="px-5 py-3">{booking.currency || "Currency unavailable"}</td></tr>)}</tbody></table></div>{!rows.length ? <EmptyState>No bookings match the current filters.</EmptyState> : null}</Panel>; }

function BusinessBlocksTable({ blocks, reservations, businessDate, onOpen, onEdit, onStatus, onRelease }: { blocks: BusinessBlock[]; reservations: Reservation[]; businessDate: string; onOpen: (id: string) => void; onEdit: (id: string) => void; onStatus: (block: BusinessBlock, status: BusinessBlockStatus) => void; onRelease: (block: BusinessBlock) => void }) { return <Panel title="Business Blocks" subtitle={`${blocks.length} blocks found`} bodyClassName="p-0"><div className="overflow-x-auto"><table className="min-w-[1250px] text-left text-sm"><thead><tr className="border-b border-line text-slate-500">{["Block No.", "Block Name", "Company", "Stay Dates", "Blocked", "Picked", "Remaining", "Cut-off", "Status", "Actions"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{blocks.map((block) => { const metrics = businessBlockMetrics(block, reservations); const due = block.status === "Active" && block.cutoffDate < businessDate; return <tr key={block.id} onDoubleClick={() => onOpen(block.id)} className="cursor-pointer border-b border-line hover:bg-slate-50"><td className="px-4 py-3 font-semibold">{block.blockNumber}</td><td className="px-4 py-3">{block.blockName}</td><td className="px-4 py-3">{block.companyName}</td><td className="px-4 py-3">{block.checkIn} – {block.checkOut}</td><td className="px-4 py-3">{metrics.blocked}</td><td className="px-4 py-3">{metrics.pickedUp}</td><td className="px-4 py-3">{metrics.remaining}</td><td className="px-4 py-3">{block.cutoffDate}{due ? <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">Release due</span> : null}</td><td className="px-4 py-3">{block.status}</td><td className="px-4 py-3"><div className="flex gap-1"><SmallAction label="View" onClick={() => onOpen(block.id)} icon={<Eye className="h-4 w-4" />} /><SmallAction label="Edit" onClick={() => onEdit(block.id)} icon={<Pencil className="h-4 w-4" />} />{block.status === "Tentative" ? <SmallAction label="Activate" onClick={() => onStatus(block, "Active")} /> : null}{block.status === "Active" ? <><SmallAction label="Release" onClick={() => onRelease(block)} /><SmallAction label="Cancel" onClick={() => onStatus(block, "Cancelled")} /></> : null}</div></td></tr>; })}</tbody></table></div>{!blocks.length ? <EmptyState>No business blocks match the current filters.</EmptyState> : null}</Panel>; }
function SmallAction({ label, onClick, icon }: { label: string; onClick: () => void; icon?: React.ReactNode }) { return <button type="button" title={label} onDoubleClick={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onClick(); }} className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-xs font-semibold">{icon}{label}</button>; }
