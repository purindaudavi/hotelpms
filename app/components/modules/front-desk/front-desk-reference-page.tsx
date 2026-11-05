"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { property, type Reservation, type Room } from "@/app/data/pms-data";
import { getRatePlans } from "@/app/lib/rates-api";
import { getRoomCatalog } from "@/app/lib/rooms-api";
import { getTravelAgents } from "@/app/lib/travel-agent-api";
import { getApiErrorMessage } from "@/app/lib/api";
import type { RatePlan } from "./types";
import type { TravelAgent } from "../reservation/types";

export function FrontDeskReferencePage({ propertyId, activePath, reservations, roomList }: {
  propertyId: string; activePath: string; reservations: Reservation[]; roomList: Room[];
}) {
  const [query, setQuery] = useState("");
  const [rates, setRates] = useState<RatePlan[]>([]);
  const [roomNames, setRoomNames] = useState<Record<string, string>>({});
  const [agents, setAgents] = useState<TravelAgent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setQuery(""); setError(""); setRates([]); setAgents([]);
    if (!["rooms-rates/rates", "reservation/travel-agents"].includes(activePath)) return;
    setLoading(true);
    const load = async () => {
      if (activePath === "rooms-rates/rates") {
        const [plans, catalog] = await Promise.all([getRatePlans(propertyId), getRoomCatalog(propertyId)]);
        if (active) { setRates(plans); setRoomNames(Object.fromEntries(catalog.roomTypes.map((type) => [type.id, type.name]))); }
      } else { const records = await getTravelAgents(propertyId); if (active) setAgents(records); }
    };
    void load().catch((failure) => { if (active) setError(getApiErrorMessage(failure, "Could not load these records.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [propertyId, activePath, attempt]);

  if (activePath === "dashboard") {
    const date = property.systemDate;
    const operational = reservations.filter((booking) => !["Cancelled", "No Show", "Blocked"].includes(booking.status));
    const arrivals = operational.filter((booking) => booking.checkIn === date);
    const departures = operational.filter((booking) => booking.checkOut === date);
    const sellable = roomList.filter((room) => !["Out of Order", "Maintenance"].includes(room.status));
    const occupied = sellable.filter((room) => room.status === "Occupied").length;
    return <main className="space-y-5 p-4 lg:p-6"><header><h1 className="text-3xl font-bold">Front Desk overview</h1><p className="mt-2 text-sm text-slate-500">Daily operations · {date}</p></header>
      <div className="grid gap-4 md:grid-cols-3">{[
        ["Arrivals", String(arrivals.length), `${arrivals.reduce((sum, booking) => sum + booking.adults + booking.children, 0)} guests`],
        ["Departures", String(departures.length), "Reservations departing on this date"],
        ["Occupancy", `${sellable.length ? (occupied / sellable.length * 100).toFixed(1) : "0.0"}%`, `${occupied} / ${sellable.length} sellable rooms`]
      ].map(([label, value, detail]) => <section key={label} className="rounded-xl border border-line bg-white p-6"><h2 className="text-sm font-semibold text-slate-500">{label}</h2><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-2 text-sm text-slate-500">{detail}</p></section>)}</div>
      <div className="flex flex-wrap gap-3">{[["front-desk", "Open Front Desk"], ["reservation/arrivals", "View arrivals"], ["reservation/departures", "View departures"], ["financials/invoices", "Guest invoices & payments"]].map(([path, title]) => <Link key={path} href={`/properties/${propertyId}/${path}`} className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-blue-600">{title}</Link>)}</div>
    </main>;
  }
  const ratesView = activePath === "rooms-rates/rates";
  const agentsView = activePath === "reservation/travel-agents";
  const housekeeping = activePath.startsWith("housekeeping");
  const title = ratesView ? "Rates" : agentsView ? "Travel agents" : housekeeping ? "Housekeeping readiness" : "Rooms";
  const columns = ratesView ? ["Rate plan", "Room type", "Meal plan", "Currency", "Nightly price", "Status"]
    : agentsView ? ["Agent", "Code", "Contact", "Email", "Phone", "Status"] : ["Room", "Room type", "Floor", "Operational status", "Housekeeping"];
  const rows: string[][] = ratesView ? rates.flatMap((plan) => Object.entries(plan.roomTypeRates).map(([id, amount]) => [plan.name, roomNames[id] || id, plan.mealPlan, plan.currency, Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 }), plan.active ? "Active" : "Disabled"]))
    : agentsView ? agents.map((agent) => [agent.name, agent.code, agent.contactPerson, agent.email, agent.phone, agent.status])
      : roomList.map((room) => [room.code, room.type, room.floor, room.status, room.housekeeping]);
  const filtered = rows.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase()));
  return <main className="space-y-5 p-4 lg:p-6"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">{title}</h1><p className="mt-2 text-sm text-slate-500">Read-only access. Ask an owner or administrator to change these records.</p>{ratesView && <p className="mt-1 text-xs text-slate-500">Base nightly prices shown. Booking quotes include date-specific prices and occupancy supplements.</p>}</div>{(ratesView || agentsView) && <button onClick={() => setAttempt((value) => value + 1)} disabled={loading} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">Refresh</button>}</header>
    <label className="block"><span className="sr-only">Search {title.toLowerCase()}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="h-11 w-full max-w-xl rounded-lg border border-line bg-white px-3 text-sm" /></label>
    {loading && <p role="status" className="text-sm text-slate-500">Loading records…</p>}{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    <section className="overflow-hidden rounded-lg border border-line bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-semibold">{column}</th>)}</tr></thead><tbody>{filtered.map((row, index) => <tr key={index} className="border-t border-line">{row.map((value, cell) => <td key={cell} className="px-4 py-3">{value || "—"}</td>)}</tr>)}</tbody></table></div>{!loading && !error && !filtered.length && <p className="p-5 text-sm text-slate-500">No matching records.</p>}</section>
  </main>;
}
