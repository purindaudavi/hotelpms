"use client";

import { useMemo, useState } from "react";
import { Reservation } from "@/app/data/pms-data";
import { FrontDeskGrid } from "./components/front-desk-grid";
import { FrontDeskToolbar } from "./components/front-desk-toolbar";
import { ReservationDetailDrawer } from "./components/reservation-detail-drawer";
import { ReservationEditor } from "./components/reservation-editor";
import { ReservationListView } from "./components/reservation-list-view";
import { DeskTab, FrontDeskProps, ReservationForm } from "./types";
import { addDays, buildDeskColumns, longDate } from "./utils";
import { useReservationActions } from "./use-reservation-actions";
import { useReservationEditorResources } from "./use-reservation-editor-resources";

export function FrontDeskPage({ propertyId, reservations, setReservations, roomList, setRoomList, setToast }: FrontDeskProps) {
  const { businessDate, homeCurrency, ratePlans, setRatePlans } = useReservationEditorResources(propertyId);
  const [tab, setTab] = useState<DeskTab>("Front Desk");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [gridDays, setGridDays] = useState(15);
  const [dayUse, setDayUse] = useState(false);
  const [gridStartDate, setGridStartDate] = useState(addDays(businessDate, -5));
  const [dayUseDate, setDayUseDate] = useState(businessDate);
  const [editingBooking, setEditingBooking] = useState<Reservation | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const selectedBooking = reservations.find((booking) => booking.id === selectedBookingId) ?? null;
  const sources = useMemo(() => ["All", ...Array.from(new Set(reservations.map((booking) => booking.bookingSource ?? booking.source)))], [reservations]);
  const columns = useMemo(() => buildDeskColumns({ dayUse, dayUseDate, gridDays, gridStartDate, businessDate }), [businessDate, dayUse, dayUseDate, gridDays, gridStartDate]);
  const displayedDateRange = dayUse ? `${longDate(dayUseDate)} - ${longDate(dayUseDate)}` : `${longDate(columns[0]?.date ?? gridStartDate)} - ${longDate(columns.at(-1)?.date ?? gridStartDate)}`;
  const filteredReservations = reservations.filter((booking) => sourceFilter === "All" || (booking.bookingSource ?? booking.source) === sourceFilter);
  const reservationActions = useReservationActions({ propertyId, businessDate, reservations, setReservations, roomList, setRoomList, ratePlans, setToast });

  async function saveReservation(form: ReservationForm): Promise<{ ok: true } | { ok: false; error: string }> {
    const result = await reservationActions.saveReservation(form);
    if (!result.ok) return result;
    setSelectedBookingId((current) => current === result.reservation.id ? result.reservation.id : current);
    closeReservationEditor();
    return { ok: true };
  }

  function removeReservation(bookingId: string) {
    reservationActions.removeReservation(bookingId);
    setSelectedBookingId((current) => current === bookingId ? null : current);
    closeReservationEditor();
  }

  function openReservationEditor(booking: Reservation | null = null) { setEditingBooking(booking); if (booking) setSelectedBookingId(null); setModalOpen(true); }
  function closeReservationEditor() { setModalOpen(false); setEditingBooking(null); }

  return <main className="space-y-3 p-4 lg:p-5">
    <FrontDeskToolbar tab={tab} onTabChange={(next) => { setTab(next); setSelectedBookingId(null); }} sourceFilter={sourceFilter} onSourceFilterChange={setSourceFilter} sources={sources} showSourceFilter={tab === "Front Desk"} onOpenReservation={() => openReservationEditor()} setToast={setToast} />
    {tab === "Front Desk" ? <FrontDeskGrid columns={columns} displayedDateRange={displayedDateRange} roomList={roomList} reservations={filteredReservations} tab={tab} dayUse={dayUse} gridDays={gridDays} gridStartDate={gridStartDate} dayUseDate={dayUseDate} onDayUseChange={setDayUse} onGridDaysChange={setGridDays} onGridStartDateChange={setGridStartDate} onDayUseDateChange={setDayUseDate} onPreviousRange={() => dayUse ? setDayUseDate(addDays(dayUseDate, -1)) : setGridStartDate(addDays(gridStartDate, -gridDays))} onNextRange={() => dayUse ? setDayUseDate(addDays(dayUseDate, 1)) : setGridStartDate(addDays(gridStartDate, gridDays))} onBookingClick={openReservationEditor} />
      : <ReservationListView key={tab} tab={tab} reservations={reservations} businessDate={businessDate} onBookingSelect={(booking) => setSelectedBookingId(booking.id)} setToast={setToast} />}
    {selectedBooking ? <ReservationDetailDrawer key={selectedBooking.id} propertyId={propertyId} booking={selectedBooking} onClose={() => setSelectedBookingId(null)} onEdit={openReservationEditor} onRetryEmail={() => reservationActions.deliverEmail(selectedBooking).then(() => undefined)} setToast={setToast} /> : null}
    {modalOpen ? <ReservationEditor propertyId={propertyId} booking={editingBooking} reservations={reservations} roomList={roomList} ratePlans={ratePlans} setRatePlans={setRatePlans} homeCurrency={homeCurrency} defaultDate={dayUse ? dayUseDate : businessDate} onClose={closeReservationEditor} onSave={saveReservation} onDelete={removeReservation} setToast={setToast} /> : null}
  </main>;
}
