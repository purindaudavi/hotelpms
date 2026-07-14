"use client";

import { useMemo, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { Building2, ExternalLink, Grid3X3, Heart, List, Search, Star } from "lucide-react";
import { countryOptions, initialRateHunterHotels } from "../constants";
import type { RateHunterHotel, RoomsRatesModuleProps } from "../types";
import { Field, IconButton, Panel, RoomsRatesFrame, SelectInput, TextInput, ToolbarButton } from "../components/rooms-rates-ui";

export function RateHunterPage({ propertyId, setToast }: RoomsRatesModuleProps) {
  const keyPrefix = `staypilot:${propertyId}:rooms-rates`;
  const [city, setCity] = useState("katunayake");
  const [country, setCountry] = useState("Sri Lanka");
  const [checkIn, setCheckIn] = useState("2026-06-16");
  const [checkOut, setCheckOut] = useState("2026-06-17");
  const [currency, setCurrency] = useState("USD");
  const [view, setView] = useState<"list" | "table">("list");
  const [hotels, setHotels] = useSessionState(`${keyPrefix}:rate-hunter-hotels`, initialRateHunterHotels);
  const [searched, setSearched] = useState(true);

  const visibleHotels = useMemo(() => {
    if (!searched) return [];
    return [...hotels].sort((a, b) => b.competitorRate - a.competitorRate);
  }, [hotels, searched]);

  function searchHotels() {
    setSearched(true);
    setToast(`Found ${hotels.length} hotels in ${city}, ${country}`);
  }

  function toggleFavorite(id: string) {
    setHotels((current) => current.map((hotel) => (hotel.id === id ? { ...hotel, favorite: !hotel.favorite } : hotel)));
    setToast("Rate hunter favorite updated");
  }

  function openBooking(hotel: RateHunterHotel) {
    window.open(`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${hotel.name} ${city}`)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <RoomsRatesFrame>
      <div>
        <h1 className="text-3xl font-semibold">Hotel Rate Hunter</h1>
        <p className="mt-2 text-sm text-slate-500">Find hotels and compare rates from Booking.com in your area</p>
      </div>

      <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
        Using location from: Ronaka Airport Transit Hotel (katunayake, Sri Lanka)
      </div>

      <Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="City / Location">
            <TextInput value={city} onChange={(event) => setCity(event.target.value)} />
          </Field>
          <Field label="Country">
            <SelectInput value={country} onChange={(event) => setCountry(event.target.value)}>
              {countryOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Check-in Date">
            <TextInput type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} />
          </Field>
          <Field label="Check-out Date">
            <TextInput type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} />
          </Field>
          <Field label="Currency" className="max-w-48">
            <SelectInput value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option>USD</option>
              <option>LKR</option>
            </SelectInput>
          </Field>
          <div className="flex items-end justify-end">
            <ToolbarButton tone="dark" icon={<Search className="h-4 w-4" />} onClick={searchHotels}>
              Search Hotels
            </ToolbarButton>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Display currency: {currency}
        </div>
      </Panel>

      <div className="flex gap-2">
        <IconButton label="List view" active={view === "list"} onClick={() => setView("list")}>
          <List className="h-4 w-4" />
        </IconButton>
        <IconButton label="Table view" active={view === "table"} onClick={() => setView("table")}>
          <Grid3X3 className="h-4 w-4" />
        </IconButton>
      </div>

      <Panel title={`Hotels in ${city || "katunayake"}, ${country}`} subtitle={`Found ${visibleHotels.length} hotels with rates from Booking.com`}>
        {view === "list" ? (
          <div className="space-y-5">
            {visibleHotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} currency={currency} onFavorite={() => toggleFavorite(hotel.id)} onOpenBooking={() => openBooking(hotel)} />
            ))}
          </div>
        ) : (
          <HotelTable hotels={visibleHotels} currency={currency} onFavorite={toggleFavorite} onOpenBooking={openBooking} />
        )}
      </Panel>
    </RoomsRatesFrame>
  );
}

function HotelCard({
  hotel,
  currency,
  onFavorite,
  onOpenBooking
}: {
  hotel: RateHunterHotel;
  currency: string;
  onFavorite: () => void;
  onOpenBooking: () => void;
}) {
  const saving = hotel.competitorRate - hotel.myRate;
  const lowerPercent = Math.round(((hotel.competitorRate - hotel.myRate) / hotel.myRate) * 1000) / 10;

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <button type="button" onClick={onFavorite} title="Favorite" className={hotel.favorite ? "text-rose-500" : "text-slate-300"}>
          <Heart className="h-5 w-5" fill={hotel.favorite ? "currentColor" : "none"} />
        </button>
        <div className="grid h-14 w-14 place-items-center rounded-lg bg-sky-100 text-sky-600">
          <Building2 className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">{hotel.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            Scored {hotel.score} - {hotel.distance}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-slate-50 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">My Hotel Rate</p>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">{hotel.rateCode} - {hotel.roomType} - {hotel.originalCurrency}</span>
          </div>
          <p className="text-3xl font-bold">{currency} {hotel.myRate.toFixed(2)}</p>
          <p className="mt-2 text-sm text-slate-400">Total for 1 night(s) (converted from LKR)</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Booking.com Rate</p>
            <span className="rounded-full bg-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">OTA</span>
          </div>
          <p className="text-3xl font-bold text-blue-700">{currency} {hotel.competitorRate.toFixed(2)}</p>
          <p className="mt-2 text-sm text-blue-500">${hotel.competitorRate.toFixed(0)} /night</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700">
        <span>Your rate is {lowerPercent}% lower</span>
        <span className="text-lg text-slate-900">Save {saving.toFixed(2)} {currency}</span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
        <div className="text-xs font-semibold text-slate-500">
          <p>Room Type: {hotel.roomType}</p>
          <p>Meal Plan: {hotel.mealPlan}</p>
          <p>Rate Code: {hotel.rateCode}</p>
          <p>Original Currency: {hotel.originalCurrency}</p>
        </div>
        <ToolbarButton icon={<ExternalLink className="h-4 w-4" />} onClick={onOpenBooking}>
          View on Booking.com
        </ToolbarButton>
      </div>
    </section>
  );
}

function HotelTable({
  hotels,
  currency,
  onFavorite,
  onOpenBooking
}: {
  hotels: RateHunterHotel[];
  currency: string;
  onFavorite: (id: string) => void;
  onOpenBooking: (hotel: RateHunterHotel) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {["Hotel", "Score", "Distance", "My Rate", "Booking.com", "Saving", "Actions"].map((heading) => (
              <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hotels.map((hotel) => (
            <tr key={hotel.id} className="border-t border-line">
              <td className="px-4 py-3 font-semibold">{hotel.name}</td>
              <td className="px-4 py-3">{hotel.score}</td>
              <td className="px-4 py-3">{hotel.distance}</td>
              <td className="px-4 py-3">{currency} {hotel.myRate.toFixed(2)}</td>
              <td className="px-4 py-3">{currency} {hotel.competitorRate.toFixed(2)}</td>
              <td className="px-4 py-3">{currency} {(hotel.competitorRate - hotel.myRate).toFixed(2)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <ToolbarButton onClick={() => onFavorite(hotel.id)}>{hotel.favorite ? "Unsave" : "Save"}</ToolbarButton>
                  <ToolbarButton onClick={() => onOpenBooking(hotel)}>Open</ToolbarButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
