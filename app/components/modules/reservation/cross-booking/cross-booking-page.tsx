"use client";

import { useMemo, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { Link2, RefreshCw } from "lucide-react";
import { initialCrossBookLinks } from "../constants";
import type { CrossBookLink, ReservationModuleProps } from "../types";
import { Panel, ReservationPageFrame, SearchBox, ToolbarButton } from "../components/reservation-ui";

export function CrossBookingPage({ propertyId, roomList, setToast }: ReservationModuleProps) {
  const keyPrefix = `staypilot:${propertyId}:reservation:cross-booking`;
  const [links, setLinks] = useSessionState<CrossBookLink[]>(`${keyPrefix}:links`, initialCrossBookLinks);
  const [primaryRoom, setPrimaryRoom] = useSessionState(`${keyPrefix}:primary-room`, initialCrossBookLinks[0]?.primaryRoom ?? roomList[0]?.code ?? "02");
  const [primarySearch, setPrimarySearch] = useState("");
  const [crossSearch, setCrossSearch] = useState("");

  const selectedLink = links.find((link) => link.primaryRoom === primaryRoom) ?? { primaryRoom, blockedRooms: [] };
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
    setLinks((current) => (current.some((link) => link.primaryRoom === code) ? current : [...current, { primaryRoom: code, blockedRooms: [] }]));
  }

  function toggleBlockedRoom(code: string) {
    setLinks((current) =>
      current.map((link) => {
        if (link.primaryRoom !== primaryRoom) return link;
        const exists = link.blockedRooms.includes(code);
        return {
          ...link,
          blockedRooms: exists ? link.blockedRooms.filter((roomCode) => roomCode !== code) : [...link.blockedRooms, code]
        };
      })
    );
    setToast(`Cross-book links updated for room ${primaryRoom}`);
  }

  function refresh() {
    setLinks(initialCrossBookLinks);
    setPrimaryRoom(initialCrossBookLinks[0]?.primaryRoom ?? roomList[0]?.code ?? "02");
    setPrimarySearch("");
    setCrossSearch("");
    setToast("Cross booking links refreshed");
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
            Select a primary room on the left, then assign rooms on the right that should be blocked when the primary room is booked.
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

        <Panel title="Cross-book to" subtitle={`Rooms linked to ${primaryRoom}`}>
          <div className="mb-4">
            <SearchBox value={crossSearch} onChange={(event) => setCrossSearch(event.target.value)} placeholder="Search cross-book rooms..." />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {crossRooms.map((room) => (
              <RoomCard
                key={room.id}
                checked={selectedLink.blockedRooms.includes(room.code)}
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
