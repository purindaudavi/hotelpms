"use client";

import { CheckCircle2, DownloadCloud, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import {
  type ChannelBookingSessionRecord,
  type ChannelLogEntry,
  channelBookingsKey,
  channelLogsKey,
  initialChannelBookings,
  makeLogEntry,
  makePulledBooking
} from "@/app/components/modules/channelmanager/session";

type ChannelManagerPullFutureReservationsPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

type PullResult = {
  pulledAt: string;
  count: number;
  reservations: string[];
};

export function ChannelManagerPullFutureReservationsPage({ propertyId, setToast }: ChannelManagerPullFutureReservationsPageProps) {
  const [bookings, setBookings] = useSessionState<ChannelBookingSessionRecord[]>(channelBookingsKey(propertyId), initialChannelBookings);
  const [logs, setLogs] = useSessionState<ChannelLogEntry[]>(channelLogsKey(propertyId), []);
  const [lastPull, setLastPull] = useSessionState<PullResult | null>(`staypilot:${propertyId}:channel-manager:pull-future:last-result`, null);
  const [pulling, setPulling] = useState(false);

  const unacknowledged = bookings.filter((booking) => !booking.acked);

  function pullReservations() {
    setPulling(true);
    const pulled = [makePulledBooking(1, "Agoda"), makePulledBooking(2, "Expedia"), makePulledBooking(3, "Booking.com")];
    const existingIds = new Set(bookings.map((booking) => booking.uniqueId));
    const newRecords = pulled.filter((booking) => !existingIds.has(booking.uniqueId));
    const nextBookings = [...newRecords, ...bookings];

    setBookings(nextBookings);
    const result: PullResult = {
      pulledAt: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      count: newRecords.length,
      reservations: newRecords.map((booking) => booking.uniqueId)
    };
    setLastPull(result);
    setLogs([
      makeLogEntry({
        channel: "All Channels",
        event: "Pull unacknowledged reservations",
        status: newRecords.length ? "Success" : "Info",
        direction: "Inbound",
        message: newRecords.length ? `${newRecords.length} unacknowledged future reservation(s) pulled into the session.` : "No new unacknowledged reservations were returned.",
        payload: JSON.stringify({ pulled: result.reservations })
      }),
      ...logs
    ]);
    setToast(newRecords.length ? "Unacknowledged reservations pulled" : "No new unacknowledged reservations");
    window.setTimeout(() => setPulling(false), 250);
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-6 py-10">
      <div className="mx-auto w-full max-w-[1500px]">
        <h1 className="mb-8 text-4xl font-semibold tracking-tight">Pull Unacknowledged Reservations</h1>

        <section className="rounded-lg border border-line bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">Pull Unacknowledged Reservations</h2>
              <p className="mt-2 text-lg text-slate-500">Send a POST request to pull unacknowledged reservations for the selected property</p>
            </div>
            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-950">{unacknowledged.length}</span> unacknowledged in session
            </div>
          </div>

          <button type="button" onClick={pullReservations} disabled={pulling} className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-slate-950 px-6 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {pulling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
            Pull Reservations
          </button>

          {lastPull ? (
            <div className="mt-8 rounded-md border border-line p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Last pull completed at {lastPull.pulledAt}
              </div>
              <p className="mt-2 text-sm text-slate-600">{lastPull.count} new reservation(s) added to this session.</p>
              {lastPull.reservations.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Reservation</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {lastPull.reservations.map((reservation) => (
                        <tr key={reservation}>
                          <td className="px-4 py-3 font-semibold">{reservation}</td>
                          <td className="px-4 py-3 text-amber-700">Unacknowledged</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
