"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Grid3X3, List, RefreshCw } from "lucide-react";
import {
  createEvent,
  deleteEvent as deleteEventRequest,
  getEventApiErrorMessage,
  listEvents,
  updateEvent
} from "@/app/lib/event-api";
import { reservationSystemDate, venueOptions } from "../constants";
import type { EventBooking, ReservationModuleProps } from "../types";
import { addDays, dateLabel, formatShortDate, weekdayLabel } from "../utils";
import {
  Field,
  IconButton,
  Modal,
  Panel,
  ReservationPageFrame,
  SelectInput,
  TextInput,
  ToolbarButton
} from "../components/reservation-ui";

const hours = Array.from({ length: 24 }, (_, index) => index);

export function EventBookingsPage({ propertyId, setToast }: ReservationModuleProps) {
  const [events, setEvents] = useState<EventBooking[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(reservationSystemDate));
  const [venue, setVenue] = useState("All venues");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(reservationSystemDate);
  const [createHour, setCreateHour] = useState(10);
  const [editingEvent, setEditingEvent] = useState<EventBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const visibleEvents = useMemo(() => {
    const rangeEnd = addDays(weekStart, 6);
    return events.filter((event) => event.date >= weekStart && event.date <= rangeEnd && (venue === "All venues" || event.venue === venue));
  }, [events, venue, weekStart]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");

    listEvents(propertyId, {
      dateFrom: weekStart,
      dateTo: addDays(weekStart, 6),
      venue
    })
      .then((result) => {
        if (!cancelled) setEvents(result.events);
      })
      .catch((error) => {
        if (cancelled) return;
        setEvents([]);
        setLoadError(getEventApiErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId, reload, venue, weekStart]);

  function refreshCalendar() {
    setReload((value) => value + 1);
    setToast("Refreshing event bookings from MongoDB");
  }

  async function saveEvent(event: EventBooking) {
    if (event.end <= event.start) {
      return "End time must be later than start time.";
    }

    const conflict = events.find((existing) =>
      existing.id !== event.id &&
      existing.date === event.date &&
      existing.venue === event.venue &&
      event.start < existing.end &&
      event.end > existing.start
    );

    if (conflict) {
      return `${event.venue} is already booked from ${conflict.start} to ${conflict.end} for “${conflict.title}”.`;
    }

    const isEditing = editingEvent !== null;
    try {
      const savedEvent = isEditing
        ? await updateEvent(propertyId, event)
        : await createEvent(propertyId, event);

      setEvents((current) => isEditing
        ? current.map((existing) => existing.id === savedEvent.id ? savedEvent : existing)
        : [savedEvent, ...current]
      );
      setCreateOpen(false);
      setEditingEvent(null);
      setToast(isEditing ? "Event booking updated in MongoDB" : "Event booking created in MongoDB");
      return null;
    } catch (error) {
      return getEventApiErrorMessage(error);
    }
  }

  function closeEventForm() {
    setCreateOpen(false);
    setEditingEvent(null);
  }

  async function deleteEvent(event: EventBooking) {
    if (!window.confirm(`Delete “${event.title}”? This action cannot be undone.`)) return;

    try {
      await deleteEventRequest(propertyId, event.id);
      setEvents((current) => current.filter((existing) => existing.id !== event.id));
      closeEventForm();
      setToast("Event booking deleted from MongoDB");
      return null;
    } catch (error) {
      return getEventApiErrorMessage(error);
    }
  }

  function editEvent(event: EventBooking) {
    setEditingEvent(event);
    setCreateDate(event.date);
    setCreateOpen(true);
  }

  return (
    <ReservationPageFrame>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Event bookings</h1>
          <p className="mt-1 text-sm text-slate-500">System date: {formatShortDate(reservationSystemDate)}</p>
        </div>

        <div className="grid w-full gap-3 md:w-auto md:grid-cols-[auto_270px_auto_110px_250px_100px_130px_180px] md:items-end">
          <Field label="Date range" className="md:col-span-3">
            <div className="flex gap-2">
              <IconButton label="Previous range" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <div className="flex h-11 min-w-64 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold">
                {formatShortDate(weekStart)} - {formatShortDate(addDays(weekStart, 6))}
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
          <ToolbarButton
            disabled={loading}
            icon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
            onClick={refreshCalendar}
          >
            Refresh
          </ToolbarButton>
          <ToolbarButton tone="purple" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => {
            setEditingEvent(null);
            setCreateDate(reservationSystemDate);
            setCreateHour(10);
            setCreateOpen(true);
          }}>
            Create event
          </ToolbarButton>
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      ) : null}

      {view === "grid" ? (
        <CalendarGrid days={days} events={visibleEvents} onEventClick={editEvent} onSlotClick={(date, hour) => {
          setEditingEvent(null);
          setCreateDate(date);
          setCreateHour(hour);
          setCreateOpen(true);
          setToast(`Creating event on ${date} at ${String(hour).padStart(2, "0")}:00`);
        }} />
      ) : (
        <EventList events={visibleEvents} onEventClick={editEvent} />
      )}

      {createOpen ? (
        <EventFormModal
          initialDate={createDate}
          initialHour={createHour}
          initialEvent={editingEvent}
          onClose={closeEventForm}
          onDelete={deleteEvent}
          onSave={saveEvent}
        />
      ) : null}
    </ReservationPageFrame>
  );
}

function CalendarGrid({
  days,
  events,
  onEventClick,
  onSlotClick
}: {
  days: string[];
  events: EventBooking[];
  onEventClick: (event: EventBooking) => void;
  onSlotClick: (date: string, hour: number) => void;
}) {
  const eventLayouts = createEventLayouts(events);

  return (
    <Panel bodyClassName="p-0">
      <div className="max-h-[calc(100vh-250px)] overflow-auto">
        <div className="grid min-w-[1180px] grid-cols-[88px_repeat(7,minmax(140px,1fr))]">
          <div className="sticky left-0 top-0 z-40 border-b border-r border-line bg-slate-50 p-4 text-sm font-semibold">TIME</div>
          {days.map((day) => (
            <div
              key={day}
              className={`sticky top-0 z-30 border-b border-r border-line p-4 text-center ${
                day === reservationSystemDate ? "bg-violet-50 text-violet-700" : "bg-slate-50"
              }`}
            >
              <p className="text-xs font-semibold text-slate-500">{weekdayLabel(day)}</p>
              <p className="text-base font-semibold">{dateLabel(day)}</p>
              {day === reservationSystemDate ? <p className="mt-1 text-xs font-bold text-violet-600">SYSTEM</p> : null}
            </div>
          ))}

          {hours.map((hour) => (
            <TimeRow
              key={hour}
              hour={hour}
              days={days}
              events={events}
              eventLayouts={eventLayouts}
              onEventClick={onEventClick}
              onSlotClick={onSlotClick}
            />
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
  eventLayouts,
  onEventClick,
  onSlotClick
}: {
  hour: number;
  days: string[];
  events: EventBooking[];
  eventLayouts: Map<string, EventLayout>;
  onEventClick: (event: EventBooking) => void;
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
          <div
            key={`${day}-${hour}`}
            role="button"
            tabIndex={0}
            onClick={() => onSlotClick(day, hour)}
            onKeyDown={(keyboardEvent) => {
              if (
                keyboardEvent.target === keyboardEvent.currentTarget &&
                (keyboardEvent.key === "Enter" || keyboardEvent.key === " ")
              ) onSlotClick(day, hour);
            }}
            className={`relative h-20 border-b border-r border-line text-left transition hover:bg-slate-50 ${day === reservationSystemDate ? "bg-violet-50/40" : "bg-white"}`}
          >
            {cellEvents.map((event) => {
              const startMinutes = timeToMinutes(event.start);
              const endMinutes = timeToMinutes(event.end);
              const layout = eventLayouts.get(event.id) ?? { laneIndex: 0, laneCount: 1 };
              const top = ((startMinutes % 60) / 60) * 80 + 4;
              const height = Math.max(((endMinutes - startMinutes) / 60) * 80 - 8, 36);
              const laneWidth = 100 / layout.laneCount;

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onEventClick(event);
                  }}
                  style={{
                    top,
                    height,
                    left: `calc(${layout.laneIndex * laneWidth}% + 4px)`,
                    width: `calc(${laneWidth}% - 8px)`
                  }}
                  className={`absolute z-10 overflow-hidden rounded-md px-2 py-1 text-left text-xs font-semibold shadow-sm transition hover:z-20 hover:ring-2 hover:ring-white/70 ${
                    event.status === "Confirmed" ? "bg-emerald-100 text-emerald-800" : event.status === "Tentative" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  <p className="truncate">{event.title}</p>
                  <p className="truncate font-normal">{event.start} - {event.end}</p>
                  <p className="truncate font-normal opacity-80">{event.venue}</p>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

type EventLayout = {
  laneIndex: number;
  laneCount: number;
};

function createEventLayouts(events: EventBooking[]) {
  const layouts = new Map<string, EventLayout>();
  const eventsByDate = new Map<string, EventBooking[]>();

  events.forEach((event) => {
    eventsByDate.set(event.date, [...(eventsByDate.get(event.date) ?? []), event]);
  });

  eventsByDate.forEach((dayEvents) => {
    const sortedEvents = [...dayEvents].sort((first, second) =>
      timeToMinutes(first.start) - timeToMinutes(second.start) ||
      timeToMinutes(first.end) - timeToMinutes(second.end)
    );
    let overlapGroup: EventBooking[] = [];
    let groupEnd = -1;

    function placeOverlapGroup() {
      if (!overlapGroup.length) return;

      const laneEndTimes: number[] = [];
      const assignments = overlapGroup.map((event) => {
        const start = timeToMinutes(event.start);
        const end = timeToMinutes(event.end);
        let laneIndex = laneEndTimes.findIndex((laneEnd) => laneEnd <= start);

        if (laneIndex === -1) {
          laneIndex = laneEndTimes.length;
          laneEndTimes.push(end);
        } else {
          laneEndTimes[laneIndex] = end;
        }

        return { event, laneIndex };
      });

      assignments.forEach(({ event, laneIndex }) => {
        layouts.set(event.id, { laneIndex, laneCount: laneEndTimes.length });
      });
    }

    sortedEvents.forEach((event) => {
      const start = timeToMinutes(event.start);
      const end = timeToMinutes(event.end);

      if (overlapGroup.length && start >= groupEnd) {
        placeOverlapGroup();
        overlapGroup = [];
        groupEnd = -1;
      }

      overlapGroup.push(event);
      groupEnd = Math.max(groupEnd, end);
    });

    placeOverlapGroup();
  });

  return layouts;
}

function EventList({ events, onEventClick }: { events: EventBooking[]; onEventClick: (event: EventBooking) => void }) {
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
            <tr key={event.id} onClick={() => onEventClick(event)} className="cursor-pointer border-t border-line hover:bg-slate-50">
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

function EventFormModal({
  initialDate,
  initialHour,
  initialEvent,
  onClose,
  onDelete,
  onSave
}: {
  initialDate: string;
  initialHour: number;
  initialEvent: EventBooking | null;
  onClose: () => void;
  onDelete: (event: EventBooking) => Promise<string | null | undefined>;
  onSave: (event: EventBooking) => Promise<string | null>;
}) {
  const initialStart = `${String(initialHour).padStart(2, "0")}:00`;
  const initialEnd = initialHour === 23 ? "23:59" : `${String(initialHour + 1).padStart(2, "0")}:00`;
  const [event, setEvent] = useState<EventBooking>(initialEvent ? { ...initialEvent } : {
    id: `event-${Date.now()}`,
    title: "",
    venue: "Meeting Room",
    date: initialDate,
    start: initialStart,
    end: initialEnd,
    owner: "Asiri Perera",
    status: "Confirmed"
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof EventBooking>(key: K, value: EventBooking[K]) {
    setEvent((current) => ({ ...current, [key]: value }));
  }

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setSaving(true);
    setError("");
    const requestError = await onSave(event);
    if (requestError) {
      setError(requestError);
      setSaving(false);
    }
  }

  async function removeEvent() {
    if (!initialEvent) return;
    setSaving(true);
    setError("");
    const requestError = await onDelete(initialEvent);
    if (requestError === undefined) {
      setSaving(false);
    } else if (requestError) {
      setError(requestError);
      setSaving(false);
    }
  }

  return (
    <Modal title={initialEvent ? "Edit event" : "Create event"} onClose={onClose}>
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
        {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
          <div>
            {initialEvent ? (
              <button
                type="button"
                onClick={removeEvent}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-md border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Working..." : "Delete event"}
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <ToolbarButton disabled={saving} onClick={onClose}>Cancel</ToolbarButton>
            <ToolbarButton disabled={saving} type="submit" tone="purple">
              {saving ? "Saving..." : initialEvent ? "Save changes" : "Create event"}
            </ToolbarButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function startOfWeek(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return addDays(value, -date.getDay());
}
