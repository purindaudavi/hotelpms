"use client";

import { useMemo, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { Link2, RefreshCw } from "lucide-react";
import { initialCrossBookLinks } from "../constants";
import type { CrossBookLink, ReservationModuleProps } from "../types";
import { Panel, ReservationPageFrame, SearchBox, ToolbarButton } from "../components/reservation-ui";
import {
  crossBookedRoomCodes,
  crossBookLinksStorageKey,
  isCrossBookLinkArray,
  normalizeCrossBookLinks,
  toggleCrossBookPair
} from "@/app/lib/cross-booking";

export function CrossBookingPage({ propertyId, roomList, setToast }: ReservationModuleProps) {
  const keyPrefix = `staypilot:${propertyId}:reservation:cross-booking`;
  const [links, setLinks] = useSessionState<CrossBookLink[]>(
    crossBookLinksStorageKey(propertyId),
    initialCrossBookLinks,
    isCrossBookLinkArray,
    normalizeCrossBookLinks
  );
  const [primaryRoom, setPrimaryRoom] = useSessionState(`${keyPrefix}:primary-room`, initialCrossBookLinks[0]?.primaryRoom ?? roomList[0]?.code ?? "02");
  const [primarySearch, setPrimarySearch] = useState("");
  const [crossSearch, setCrossSearch] = useState("");

  const linkedRooms = crossBookedRoomCodes(links, primaryRoom);
  const primaryRooms = useMemo(
    () =>
      roomList.filter((room) =>
        [room.code, room.type, room.floor].join(" ").toLowerCase().includes(primarySearch.trim().toLowerCase())
      ),
    [primarySearch, roomList]
  );
  const crossRooms = useMemo(
    () =>
      roomList.filter(
        (room) =>
          room.code !== primaryRoom &&
          [room.code, room.type, room.floor].join(" ").toLowerCase().includes(crossSearch.trim().toLowerCase())
      ),
    [crossSearch, primaryRoom, roomList]
  );

  function setPrimary(code: string) {
    setPrimaryRoom(code);
  }

  function toggleBlockedRoom(code: string) {
    setLinks((current) => toggleCrossBookPair(current, primaryRoom, code));
    setToast(`Cross-book relationship updated for rooms ${primaryRoom} and ${code}`);
  }

  function refresh() {
    setPrimarySearch("");
    setCrossSearch("");
    setToast("Cross-booking view refreshed; saved links were kept");
  }

  return (
    <ReservationPageFrame>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            <Link2 className="h-6 w-6" />
            Cross Booking
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Link rooms only when they share inventory and cannot be sold for overlapping stay dates. The relationship works in both directions.
          </p>
        </div>
        <ToolbarButton icon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>
          Refresh
        </ToolbarButton>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Primary rooms" subtitle="Choose one primary room to configure cross-book links.">
          <div className="mb-4">
            <SearchBox value={primarySearch} onChange={(event) => setPrimarySearch(event.target.value)} placeholder="Search primary rooms..." />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {primaryRooms.map((room) => (
              <RoomCard
                key={room.id}
                checked={primaryRoom === room.code}
                code={room.code}
                type={room.type}
                onClick={() => setPrimary(room.code)}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Cross-book to" subtitle={`Rooms that cannot be sold together with ${primaryRoom}`}>
          <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${linkedRooms.length ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
            {linkedRooms.length
              ? `Room ${primaryRoom} conflicts with ${linkedRooms.join(", ")}. Booking either side makes the other unavailable for the same dates.`
              : `Room ${primaryRoom} has no cross-book relationships. This is the safe default for an independent physical room.`}
          </div>
          <div className="mb-4">
            <SearchBox value={crossSearch} onChange={(event) => setCrossSearch(event.target.value)} placeholder="Search cross-book rooms..." />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {crossRooms.map((room) => (
              <RoomCard
                key={room.id}
                checked={linkedRooms.includes(room.code)}
                code={room.code}
                type={room.type}
                onClick={() => toggleBlockedRoom(room.code)}
              />
            ))}
          </div>
        </Panel>
      </div>
    </ReservationPageFrame>
  );
}

function RoomCard({ checked, code, type, onClick }: { checked: boolean; code: string; type: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 items-start gap-3 rounded-lg border p-4 text-left transition ${
        checked ? "border-slate-950 bg-slate-100" : "border-line bg-white hover:border-slate-300"
      }`}
    >
      <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border ${checked ? "border-slate-950 bg-slate-950" : "border-slate-400 bg-white"}`}>
        {checked ? <span className="h-2 w-2 rounded-sm bg-white" /> : null}
      </span>
      <span>
        <span className="block text-base font-semibold">{code}</span>
        <span className="block text-sm text-slate-500">{type}</span>
      </span>
    </button>
  );
}
