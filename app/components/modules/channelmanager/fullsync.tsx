"use client";

import { CalendarDays, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import {
  type ChannelBookingSessionRecord,
  type ChannelInventoryState,
  type ChannelLogEntry,
  type ChannelRoomRecord,
  buildChannelInventoryRooms,
  buildChannelInventorySyncSummary,
  channelBookingsKey,
  channelInventoryKey,
  channelLogsKey,
  channelRoomRatesKey,
  defaultChannelInventoryState,
  initialChannelBookings,
  initialChannelRooms,
  isBookingInRange,
  makeLogEntry
} from "@/app/components/modules/channelmanager/session";

type ChannelManagerFullSyncPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

type SyncResult = {
  syncedAt: string;
  fromDate: string;
  toDate: string;
  bookings: number;
  channels: number;
  rooms: number;
  dates: number;
  availabilityCells: number;
  rateCells: number;
  overrides: number;
  activeRules: number;
  status: "Success" | "Warning";
};

export function ChannelManagerFullSyncPage({ propertyId, setToast }: ChannelManagerFullSyncPageProps) {
  const [fromDate, setFromDate] = useState(() => formatLocalDate(new Date()));
  const [toDate, setToDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return formatLocalDate(date);
  });
  const [bookings] = useSessionState<ChannelBookingSessionRecord[]>(channelBookingsKey(propertyId), initialChannelBookings);
  const [channelRooms] = useSessionState<ChannelRoomRecord[]>(channelRoomRatesKey(propertyId), initialChannelRooms);
  const [inventoryState] = useSessionState<ChannelInventoryState>(channelInventoryKey(propertyId), defaultChannelInventoryState);
  const [logs, setLogs] = useSessionState<ChannelLogEntry[]>(channelLogsKey(propertyId), []);
  const [lastResult, setLastResult] = useSessionState<SyncResult | null>(`staypilot:${propertyId}:channel-manager:full-sync:last-result`, null);
  const [syncing, setSyncing] = useState(false);

  const inventoryRooms = useMemo(() => buildChannelInventoryRooms(channelRooms), [channelRooms]);
  const preview = useMemo(() => bookings.filter((booking) => isBookingInRange(booking, fromDate, toDate)), [bookings, fromDate, toDate]);
  const inventorySummary = useMemo(() => buildChannelInventorySyncSummary(inventoryRooms, inventoryState, fromDate, toDate), [inventoryRooms, inventoryState, fromDate, toDate]);
  const channelCount = new Set(bookings.map((booking) => booking.source).filter(Boolean)).size;

  function runSync() {
    if (!fromDate || !toDate || new Date(fromDate) > new Date(toDate)) {
      setToast("Choose a valid sync date range");
      return;
    }

    setSyncing(true);
    const result: SyncResult = {
      syncedAt: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      fromDate,
      toDate,
      bookings: preview.length,
      channels: channelCount,
      rooms: inventorySummary.rooms,
      dates: inventorySummary.dates,
      availabilityCells: inventorySummary.availabilityCells,
      rateCells: inventorySummary.rateCells,
      overrides: inventorySummary.overrides,
      activeRules: inventorySummary.activeRules.length,
      status: inventorySummary.rooms && inventorySummary.dates ? "Success" : "Warning"
    };

    const syncLogs = [
      makeLogEntry({
        channel: "All Channels",
        event: "Local sync preview requested",
        status: "Info",
        direction: "Outbound",
        message: `Local sync preview requested from ${fromDate} to ${toDate}. No data was sent to an OTA.`,
        payload: JSON.stringify({ fromDate, toDate, rooms: inventorySummary.rooms, overrides: inventorySummary.overrides })
      }),
      makeLogEntry({
        channel: "All Channels",
        event: "Local sync preview completed",
        status: result.status,
        direction: "Inbound",
        message: `${inventorySummary.rooms} room type(s), ${inventorySummary.availabilityCells} availability value(s), ${inventorySummary.rateCells} rate value(s), and ${preview.length} booking record(s) checked across ${channelCount} channel(s).`,
        payload: JSON.stringify({
          bookings: preview.length,
          channels: channelCount,
          inventory: {
            fromDate,
            toDate,
            rooms: inventorySummary.rooms,
            dates: inventorySummary.dates,
            availabilityCells: inventorySummary.availabilityCells,
            rateCells: inventorySummary.rateCells,
            overrides: inventorySummary.overrides,
            activeRules: inventorySummary.activeRules,
            sampleRows: inventorySummary.sampleRows
          }
        })
      })
    ];

    setLogs([...syncLogs, ...logs]);
    setLastResult(result);
    setToast(result.status === "Success" ? "Local channel sync preview completed; nothing was sent to an OTA" : "Local preview completed with no inventory dates");
    window.setTimeout(() => setSyncing(false), 250);
  }

  return (
    <main className="grid min-h-[calc(100vh-72px)] place-items-center bg-white px-4 py-4">
      <section className="w-full max-w-xl rounded-lg border border-line bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-slate-500" />
          <h1 className="text-xl font-semibold">Channel Sync Preview</h1>
        </div>

        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          No provider API is connected. This calculates a local preview and records test logs; it does not update Agoda, Expedia, or Booking.com.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-500">From date</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="focus-ring h-12 w-full rounded-md border border-line px-4 text-base" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-500">To date</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="focus-ring h-12 w-full rounded-md border border-line px-4 text-base" />
          </label>
        </div>

        <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex justify-between gap-4">
            <span>Rooms from Room and Rates</span>
            <strong>{inventorySummary.rooms}</strong>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span>Inventory dates</span>
            <strong>{inventorySummary.dates}</strong>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span>Availability values</span>
            <strong>{inventorySummary.availabilityCells}</strong>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span>Rate values</span>
            <strong>{inventorySummary.rateCells}</strong>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span>Overrides / active rules</span>
            <strong>
              {inventorySummary.overrides} / {inventorySummary.activeRules.length}
            </strong>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span>Bookings in range</span>
            <strong>{preview.length}</strong>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span>Channel sources in preview</span>
            <strong>{channelCount}</strong>
          </div>
        </div>

        {lastResult ? (
          <div className="mt-5 rounded-md border border-line p-4 text-sm">
            <p className="font-semibold">Last preview: {lastResult.syncedAt}</p>
            <p className="mt-1 text-slate-600">
              {lastResult.rooms ?? 0} room(s), {lastResult.availabilityCells ?? 0} availability value(s), {lastResult.rateCells ?? 0} rate value(s), {lastResult.bookings} booking(s), status {lastResult.status}
            </p>
          </div>
        ) : null}

        <button type="button" onClick={runSync} disabled={syncing} className="mt-6 inline-flex h-12 min-w-28 items-center justify-center gap-2 rounded-md bg-slate-950 px-6 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Preparing..." : "Run local preview"}
        </button>
      </section>
    </main>
  );
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
