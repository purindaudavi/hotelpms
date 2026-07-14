"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { CalendarPlus, ChevronLeft, ChevronRight, Grid3X3, List, RefreshCw } from "lucide-react";
import { initialEvents, reservationSystemDate, venueOptions } from "../constants";
import type { EventBooking, ReservationModuleProps } from "../types";
import { addDays, dateLabel, weekdayLabel } from "../utils";
import {
  Field,
  IconButton,
  Modal,
  Panel,
  ReservationPageFrame,
  SegmentedTabs,
  SelectInput,
  TextInput,
  ToolbarButton
} from "../components/reservation-ui";

const hours = Array.from({ length: 24 }, (_, index) => index);

export function EventBookingsPage({ propertyId, setToast }: ReservationModuleProps) {
  const [events, setEvents] = useSessionState<EventBooking[]>(`staypilot:${propertyId}:reservation:events`, initialEvents);
  const [weekStart, setWeekStart] = useState("2026-05-31");
  const [venue, setVenue] = useState("All venues");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const visibleEvents = useMemo(() => {
    const rangeEnd = addDays(weekStart, 6);
    return events.filter((event) => event.date >= weekStart && event.date <= rangeEnd && (venue === "All venues" || event.venue === venue));
  }, [events, venue, weekStart]);

  function resetCalendar() {
    setWeekStart("2026-05-31");
    setVenue("All venues");
    setToast("Event calendar refreshed");
  }

  function addEvent(event: EventBooking) {
    setEvents((current) => [event, ...current]);
    setCreateOpen(false);
    setToast("Event booking created");
  }

  return (
    <ReservationPageFrame>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Event bookings</h1>
          <p className="mt-1 text-sm text-slate-500">System date: {dateLabel(reservationSystemDate)}, 2026</p>
        </div>

        <div className="grid w-full gap-3 md:w-auto md:grid-cols-[auto_270px_auto_110px_250px_100px_130px_180px] md:items-end">
          <Field label="Date range" className="md:col-span-3">
            <div className="flex gap-2">
              <IconButton label="Previous range" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <div className="flex h-11 min-w-64 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold">
                {dateLabel(weekStart)}, 2026 - {dateLabel(addDays(weekStart, 14))}, 2026
              </div>
              <IconButton label="Next range" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          </Field>
          <div className="pb-3 text-sm font-semibold">System date</div>
          <Field label="Venue">
            <SelectInput value={venue} onChange={(event) => setVenue(event.target.value)}>
              {venueOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="View">
            <div className="flex">
              <IconButton label="Grid view" active={view === "grid"} onClick={() => setView("grid")}>
                <Grid3X3 className="h-4 w-4" />
              </IconButton>
              <IconButton label="List view" active={view === "list"} onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </IconButton>
            </div>
          </Field>
          <ToolbarButton icon={<RefreshCw className="h-4 w-4" />} onClick={resetCalendar}>
            Refresh
          </ToolbarButton>
          <ToolbarButton tone="purple" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Create event
          </ToolbarButton>
        </div>
      </div>

      {view === "grid" ? (
        <CalendarGrid days={days} events={visibleEvents} onSlotClick={(date, hour) => {
          setCreateOpen(true);
          setToast(`Creating event on ${date} at ${String(hour).padStart(2, "0")}:00`);
        }} />
      ) : (
        <EventList events={visibleEvents} />
      )}

      {createOpen ? <EventFormModal onClose={() => setCreateOpen(false)} onSave={addEvent} /> : null}
    </ReservationPageFrame>
  );
}

function CalendarGrid({
  days,
  events,
  onSlotClick
}: {
  days: string[];
  events: EventBooking[];
  onSlotClick: (date: string, hour: number) => void;
}) {
  return (
    <Panel bodyClassName="p-0">
      <div className="max-h-[calc(100vh-250px)] overflow-auto">
        <div className="grid min-w-[1180px] grid-cols-[88px_repeat(7,minmax(140px,1fr))]">
          <div className="sticky left-0 top-0 z-20 border-b border-r border-line bg-slate-50 p-4 text-sm font-semibold">TIME</div>
          {days.map((day) => (
            <div
              key={day}
              className={`sticky top-0 z-10 border-b border-r border-line p-4 text-center ${
                day === reservationSystemDate ? "bg-violet-50 text-violet-700" : "bg-slate-50"
              }`}
            >
              <p className="text-xs font-semibold text-slate-500">{weekdayLabel(day)}</p>
              <p className="text-base font-semibold">{dateLabel(day)}</p>
              {day === reservationSystemDate ? <p className="mt-1 text-xs font-bold text-violet-600">SYSTEM</p> : null}
            </div>
          ))}

          {hours.map((hour) => (
            <TimeRow key={hour} hour={hour} days={days} events={events} onSlotClick={onSlotClick} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function TimeRow({
  hour,
  days,
  events,
  onSlotClick
}: {
  hour: number;
  days: string[];
  events: EventBooking[];
  onSlotClick: (date: string, hour: number) => void;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 h-20 border-b border-r border-line bg-white px-3 py-2 text-right text-xs text-slate-400">
        {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
      </div>
      {days.map((day) => {
        const cellEvents = events.filter((event) => event.date === day && Number(event.start.slice(0, 2)) === hour);
        return (
          <button
            key={`${day}-${hour}`}
            type="button"
            onClick={() => onSlotClick(day, hour)}
            className={`h-20 border-b border-r border-line p-2 text-left transition hover:bg-slate-50 ${day === reservationSystemDate ? "bg-violet-50/40" : "bg-white"}`}
          >
            {cellEvents.map((event) => (
              <div
                key={event.id}
                className={`mb-1 rounded-md px-2 py-1 text-xs font-semibold ${
                  event.status === "Confirmed" ? "bg-emerald-100 text-emerald-800" : event.status === "Tentative" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
                }`}
              >
                <p className="truncate">{event.title}</p>
                <p className="truncate font-normal">{event.start} - {event.end}</p>
              </div>
            ))}
          </button>
        );
      })}
    </>
  );
}

function EventList({ events }: { events: EventBooking[] }) {
  return (
    <Panel title="Event bookings" subtitle={`${events.length} events found`} bodyClassName="p-0">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {["Date", "Time", "Title", "Venue", "Owner", "Status"].map((heading) => (
              <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t border-line">
              <td className="px-5 py-3">{event.date}</td>
              <td className="px-5 py-3">{event.start} - {event.end}</td>
              <td className="px-5 py-3 font-semibold">{event.title}</td>
              <td className="px-5 py-3">{event.venue}</td>
              <td className="px-5 py-3">{event.owner}</td>
              <td className="px-5 py-3">{event.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function EventFormModal({ onClose, onSave }: { onClose: () => void; onSave: (event: EventBooking) => void }) {
  const [event, setEvent] = useState<EventBooking>({
    id: `event-${Date.now()}`,
    title: "",
    venue: "Meeting Room",
    date: reservationSystemDate,
    start: "10:00",
    end: "11:00",
    owner: "Asiri Perera",
    status: "Confirmed"
  });

  function update<K extends keyof EventBooking>(key: K, value: EventBooking[K]) {
    setEvent((current) => ({ ...current, [key]: value }));
  }

  function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    onSave(event);
  }

  return (
    <Modal title="Create event" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Event title">
          <TextInput value={event.title} onChange={(inputEvent) => update("title", inputEvent.target.value)} placeholder="Event name" required />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Venue">
            <SelectInput value={event.venue} onChange={(inputEvent) => update("venue", inputEvent.target.value)}>
              {venueOptions.filter((item) => item !== "All venues").map((item) => (
                <option key={item}>{item}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date">
            <TextInput type="date" value={event.date} onChange={(inputEvent) => update("date", inputEvent.target.value)} />
          </Field>
          <Field label="Start">
            <TextInput type="time" value={event.start} onChange={(inputEvent) => update("start", inputEvent.target.value)} />
          </Field>
          <Field label="End">
            <TextInput type="time" value={event.end} onChange={(inputEvent) => update("end", inputEvent.target.value)} />
          </Field>
          <Field label="Owner">
            <TextInput value={event.owner} onChange={(inputEvent) => update("owner", inputEvent.target.value)} />
          </Field>
          <Field label="Status">
            <SelectInput value={event.status} onChange={(inputEvent) => update("status", inputEvent.target.value as EventBooking["status"])}>
              <option>Confirmed</option>
              <option>Tentative</option>
              <option>Blocked</option>
            </SelectInput>
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
          <ToolbarButton type="submit" tone="purple">
            Create event
          </ToolbarButton>
        </div>
      </form>
    </Modal>
  );
}
