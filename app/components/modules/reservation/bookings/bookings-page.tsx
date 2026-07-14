"use client";

import { useMemo, useState } from "react";
import { Download, Plus, RefreshCw, Share2 } from "lucide-react";
import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import type { Reservation } from "@/app/data/pms-data";
import {
  businessBlockStorageKey,
  createBusinessBlock,
  isBusinessBlockArray
} from "@/app/lib/business-block-repository";
import { createUuid } from "@/app/lib/record-ids";
import { ReservationDetailDrawer } from "../../front-desk/components/reservation-detail-drawer";
import { ReservationEditor } from "../../front-desk/components/reservation-editor";
import type { ReservationForm } from "../../front-desk/types";
import { addDays } from "../../front-desk/utils";
import { useReservationActions } from "../../front-desk/use-reservation-actions";
import { useReservationEditorResources } from "../../front-desk/use-reservation-editor-resources";
import { initialBusinessBlocks } from "../constants";
import type { BookingTab, BusinessBlock, ReservationModuleProps } from "../types";
import {
  copyToClipboard,
  dateInRange,
  exportCsv,
  searchReservation
} from "../utils";
import {
  EmptyState,
  Field,
  Modal,
  Panel,
  ReservationPageFrame,
  SearchBox,
  SegmentedTabs,
  SelectInput,
  StatusPill,
  TextInput,
  ToolbarButton
} from "../components/reservation-ui";

export function BookingsPage(props: ReservationModuleProps) {
  const { propertyId, reservations, setReservations, roomList, setRoomList, setToast } = props;
  const { businessDate, homeCurrency, ratePlans, setRatePlans } = useReservationEditorResources(propertyId);
  const reservationActions = useReservationActions({
    propertyId,
    businessDate,
    reservations,
    setReservations,
    roomList,
    setRoomList,
    ratePlans,
    setToast
  });
  const [blocks, setBlocks] = useLocalStorageState<BusinessBlock[]>(
    businessBlockStorageKey(propertyId),
    initialBusinessBlocks,
    isBusinessBlockArray
  );
  const [tab, setTab] = useState<BookingTab>("reservations");
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"checkIn" | "checkOut" | "reservationDate">("checkIn");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAll, setShowAll] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [businessBlockOpen, setBusinessBlockOpen] = useState(false);

  const editingBooking = reservations.find((booking) => booking.id === editingBookingId) ?? null;
  const selectedBooking = reservations.find((booking) => booking.id === selectedBookingId) ?? null;
  const filteredReservations = useMemo(() => reservations
    .filter((booking) => {
      if (!searchReservation(booking, query)) return false;
      if (!showAll && booking.checkIn < businessDate) return false;
      return !(dateFrom || dateTo) || dateInRange(booking[dateFilter], dateFrom, dateTo);
    })
    .sort((a, b) => b.reservationDate.localeCompare(a.reservationDate) || b.resNo.localeCompare(a.resNo)),
  [businessDate, dateFilter, dateFrom, dateTo, query, reservations, showAll]);

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / rowsPerPage));
  const visibleRows = filteredReservations.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  function resetFilters() {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setShowAll(true);
    setPage(1);
    setToast("Booking filters reset");
  }

  function openReservationEditor(booking: Reservation | null = null) {
    setEditingBookingId(booking?.id ?? null);
    setSelectedBookingId(null);
    setReservationModalOpen(true);
  }

  function closeReservationEditor() {
    setReservationModalOpen(false);
    setEditingBookingId(null);
  }

  async function saveReservation(form: ReservationForm) {
    const result = await reservationActions.saveReservation(form);
    if (!result.ok) return result;
    closeReservationEditor();
    setSelectedBookingId(result.reservation.id);
    return { ok: true } as const;
  }

  function removeReservation(bookingId: string) {
    reservationActions.removeReservation(bookingId);
    setSelectedBookingId(null);
    closeReservationEditor();
  }

  function exportBookings() {
    exportCsv("reservations.csv", filteredReservations.map((booking) => ({
      "Res No": booking.resNo,
      "Booking Ref": booking.bookingReference || booking.bookingRef || "",
      "Reservation Date": booking.reservationDate,
      "Check-In": booking.checkIn,
      "Check-Out": booking.checkOut,
      "No. of Rooms": booking.rooms,
      "Booking Source": booking.bookingSource || booking.source,
      Status: booking.status,
      "Booker Name": booking.guest,
      Phone: booking.phone,
      Email: booking.email,
      Country: booking.country,
      Currency: booking.currency || homeCurrency,
      Total: booking.total,
      Paid: booking.paid
    })));
    setToast("Reservations CSV exported");
  }

  async function shareBookings() {
    const copied = await copyToClipboard(window.location.href);
    setToast(copied ? "Bookings link copied" : "Clipboard access is unavailable");
  }

  function addBusinessBlock(block: BusinessBlock) {
    try {
      setBlocks((current) => createBusinessBlock(current, block));
      setBusinessBlockOpen(false);
      setToast(`Business block ${block.blockNo} created locally`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Business block could not be created");
    }
  }

  return (
    <ReservationPageFrame>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <div className="flex flex-wrap gap-2">
          <ToolbarButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={() => openReservationEditor()}>
            Reservation
          </ToolbarButton>
          <ToolbarButton tone="dark" icon={<Share2 className="h-4 w-4" />} onClick={() => void shareBookings()}>
            Share
          </ToolbarButton>
          <ToolbarButton tone="dark" icon={<Download className="h-4 w-4" />} onClick={exportBookings}>
            Export CSV
          </ToolbarButton>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr_220px_220px_160px_140px]">
        <div className="self-end">
          <SegmentedTabs
            tabs={[{ label: "Reservations", value: "reservations" }, { label: "Business Blocks", value: "business-blocks" }]}
            value={tab}
            onChange={(next) => { setTab(next); setPage(1); }}
            className="w-full"
          />
        </div>
        <Field label="Search">
          <SearchBox value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search..." />
        </Field>
        <Field label="Date Filter Type">
          <SelectInput value={dateFilter} onChange={(event) => { setDateFilter(event.target.value as typeof dateFilter); setPage(1); }}>
            <option value="checkIn">Check-In</option>
            <option value="checkOut">Check-Out</option>
            <option value="reservationDate">Reservation Date</option>
          </SelectInput>
        </Field>
        <Field label="Date From">
          <TextInput type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
        </Field>
        <Field label="Date To">
          <TextInput type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
        </Field>
        <div className="flex items-end gap-2">
          <label className="flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
            <input type="checkbox" checked={showAll} onChange={(event) => { setShowAll(event.target.checked); setPage(1); }} className="h-4 w-4 accent-slate-900" />
            Show all
          </label>
          <ToolbarButton icon={<RefreshCw className="h-4 w-4" />} onClick={resetFilters}>Reset</ToolbarButton>
        </div>
      </div>

      {tab === "reservations" ? (
        <Panel title="Bookings" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[1700px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-slate-500">
                  {["Res No", "Booking Ref", "Reservation Date", "Check-In", "Check-Out", "No. of Rooms", "Booking Source", "Status", "Booker Name", "Phone", "Email", "Country", "Currency"].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((booking) => (
                  <tr
                    key={booking.id}
                    onDoubleClick={() => setSelectedBookingId(booking.id)}
                    title="Double-click to open reservation details"
                    className="cursor-pointer border-b border-line transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 font-medium">{booking.resNo}</td>
                    <td className="px-5 py-3">{booking.bookingReference || booking.bookingRef || "No booking reference"}</td>
                    <td className="px-5 py-3">{booking.reservationDate}</td>
                    <td className="px-5 py-3">{booking.checkIn}</td>
                    <td className="px-5 py-3">{booking.checkOut}</td>
                    <td className="px-5 py-3 text-center">{booking.rooms}</td>
                    <td className="px-5 py-3">{booking.bookingSource || booking.source}</td>
                    <td className="px-5 py-3"><StatusPill status={booking.status} /></td>
                    <td className="px-5 py-3">{booking.guest}</td>
                    <td className="px-5 py-3">{booking.phone}</td>
                    <td className="px-5 py-3">{booking.email}</td>
                    <td className="px-5 py-3">{booking.country}</td>
                    <td className="px-5 py-3">{booking.currency || homeCurrency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visibleRows.length ? <EmptyState>No bookings match the current filters.</EmptyState> : null}
        </Panel>
      ) : (
        <BusinessBlocksTable
          blocks={blocks}
          query={query}
          currency={homeCurrency}
          onAddBlock={() => setBusinessBlockOpen(true)}
          onExport={() => {
            exportCsv("business-blocks.csv", blocks.map((block) => ({
              Block: block.blockNo, Company: block.company, Contact: block.contact, Status: block.status,
              From: block.from, To: block.to, Rooms: block.rooms, Rate: block.rate, Currency: homeCurrency
            })));
            setToast("Business blocks CSV exported");
          }}
        />
      )}

      {tab === "reservations" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <span>Show</span>
            <SelectInput value={rowsPerPage} onChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(1); }} className="w-24">
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </SelectInput>
            <span>per page</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-md border border-line px-4 py-2 disabled:opacity-50">Previous</button>
            <span className="rounded-md bg-slate-950 px-4 py-2 font-semibold text-white">Page {page} of {totalPages} (Showing {visibleRows.length} of {filteredReservations.length} filtered)</span>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-md border border-line px-4 py-2 disabled:opacity-50">Next</button>
          </div>
        </div>
      ) : null}

      {reservationModalOpen ? (
        <ReservationEditor
          propertyId={propertyId}
          booking={editingBooking}
          reservations={reservations}
          roomList={roomList}
          ratePlans={ratePlans}
          setRatePlans={setRatePlans}
          homeCurrency={homeCurrency}
          defaultDate={businessDate}
          onClose={closeReservationEditor}
          onSave={saveReservation}
          onDelete={removeReservation}
          setToast={setToast}
        />
      ) : null}

      {selectedBooking ? (
        <ReservationDetailDrawer
          key={selectedBooking.id}
          propertyId={propertyId}
          booking={selectedBooking}
          onClose={() => setSelectedBookingId(null)}
          onEdit={openReservationEditor}
          onRetryEmail={() => reservationActions.deliverEmail(selectedBooking).then(() => undefined)}
          setToast={setToast}
        />
      ) : null}

      {businessBlockOpen ? (
        <BusinessBlockModal
          businessDate={businessDate}
          onClose={() => setBusinessBlockOpen(false)}
          onSave={addBusinessBlock}
        />
      ) : null}
    </ReservationPageFrame>
  );
}

function BusinessBlocksTable(props: {
  blocks: BusinessBlock[];
  query: string;
  currency: string;
  onAddBlock: () => void;
  onExport: () => void;
}) {
  const { blocks, query, currency, onAddBlock, onExport } = props;
  const visibleBlocks = blocks.filter((block) => [block.blockNo, block.company, block.contact, block.status]
    .join(" ").toLowerCase().includes(query.toLowerCase()));

  return (
    <Panel
      title="Business Blocks"
      subtitle={`${visibleBlocks.length} blocks found`}
      action={<div className="flex gap-2">
        <ToolbarButton icon={<Download className="h-4 w-4" />} onClick={onExport}>Export CSV</ToolbarButton>
        <ToolbarButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={onAddBlock}>Business Block</ToolbarButton>
      </div>}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr>
            {["Block No", "Company", "Contact", "From", "To", "Rooms", "Rate", "Status"].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}
          </tr></thead>
          <tbody>{visibleBlocks.map((block) => <tr key={block.id} className="border-t border-line">
            <td className="px-5 py-3 font-semibold">{block.blockNo}</td><td className="px-5 py-3">{block.company}</td>
            <td className="px-5 py-3">{block.contact || "No contact"}</td><td className="px-5 py-3">{block.from}</td>
            <td className="px-5 py-3">{block.to}</td><td className="px-5 py-3">{block.rooms}</td>
            <td className="px-5 py-3">{currency} {block.rate.toLocaleString()}</td>
            <td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{block.status}</span></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!visibleBlocks.length ? <EmptyState>No business blocks found.</EmptyState> : null}
    </Panel>
  );
}

function BusinessBlockModal(props: { businessDate: string; onClose: () => void; onSave: (block: BusinessBlock) => void }) {
  const { businessDate, onClose, onSave } = props;
  const [block] = useState(() => {
    const id = createUuid();
    return {
      id,
      blockNo: `BB-${id.slice(0, 8).toUpperCase()}`,
      company: "",
      contact: "",
      status: "Active",
      from: businessDate,
      to: addDays(businessDate, 1),
      rooms: 1,
      rate: 0
    } satisfies BusinessBlock;
  });
  const [draft, setDraft] = useState(block);

  function update<K extends keyof BusinessBlock>(key: K, value: BusinessBlock[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <Modal title="Create Business Block" onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSave(draft); }} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company"><TextInput value={draft.company} onChange={(event) => update("company", event.target.value)} required /></Field>
          <Field label="Contact"><TextInput value={draft.contact} onChange={(event) => update("contact", event.target.value)} /></Field>
          <Field label="From"><TextInput type="date" value={draft.from} onChange={(event) => update("from", event.target.value)} required /></Field>
          <Field label="To"><TextInput type="date" min={draft.from} value={draft.to} onChange={(event) => update("to", event.target.value)} required /></Field>
          <Field label="Rooms"><TextInput type="number" min={1} value={draft.rooms} onChange={(event) => update("rooms", Number(event.target.value))} /></Field>
          <Field label="Rate"><TextInput type="number" min={0} value={draft.rate} onChange={(event) => update("rate", Number(event.target.value))} /></Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
          <ToolbarButton type="submit" tone="dark">Save Block</ToolbarButton>
        </div>
      </form>
    </Modal>
  );
}
