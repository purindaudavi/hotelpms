"use client";

import { useMemo, useState } from "react";
import { Building2, ExternalLink, Grid3X3, Heart, List, Search, Star } from "lucide-react";
import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { property } from "@/app/data/pms-data";
import {
  convertCurrency,
  initialPropertyCurrencies,
  propertyCurrenciesStorageKey
} from "@/app/lib/currency-repository";
import { propertyDetailsStorageKey, readPropertyDetails } from "@/app/lib/property-repository";
import { getPlanRate } from "../../front-desk/rate-plans";
import type { InventoryCellMap, RatePlan, RoomTypeRecord, RoomsRatesModuleProps } from "../types";
import { addDays, makeInventoryKey } from "../utils";
import { Field, IconButton, Panel, RoomsRatesFrame, SelectInput, TextInput, ToolbarButton } from "../components/rooms-rates-ui";
import {
  type CompetitorQuote,
  type RateHunterSearchCriteria,
  searchSampleCompetitorQuotes,
  stayDates
} from "./rate-hunter-provider";

type RateHunterPageProps = RoomsRatesModuleProps & {
  roomTypes: RoomTypeRecord[];
  ratePlans: RatePlan[];
};

type SearchSnapshot = RateHunterSearchCriteria & {
  roomTypeId: string;
  ratePlanId: string;
  displayCurrency: string;
};

type Comparison = {
  quote: CompetitorQuote;
  ownAverage: number;
  ownTotal: number;
  competitorAverage: number;
  competitorTotal: number;
  difference: number;
  percentage: number;
  position: "lower" | "higher" | "equal";
};

export function RateHunterPage({ propertyId, roomTypes, ratePlans, setToast }: RateHunterPageProps) {
  const [propertyDetails] = useLocalStorageState(propertyDetailsStorageKey(propertyId), () => readPropertyDetails(propertyId));
  const [currencies] = useLocalStorageState(
    propertyCurrenciesStorageKey(propertyId),
    initialPropertyCurrencies
  );
  const [inventoryRates] = useLocalStorageState<InventoryCellMap>(
    `staypilot:${propertyId}:rooms-rates:inventory:saved-cells`,
    {}
  );
  const [favoriteIds, setFavoriteIds] = useLocalStorageState<string[]>(
    `staypilot:${propertyId}:rooms-rates:rate-hunter:favorites`,
    []
  );

  const activeRoomTypes = roomTypes.filter((roomType) => roomType.active);
  const activeRatePlans = ratePlans.filter((plan) => plan.active);
  const homeCurrency = propertyDetails.homeCurrency || property.currency;

  const [city, setCity] = useState(propertyDetails.city || property.city);
  const [country, setCountry] = useState("Sri Lanka");
  const [checkIn, setCheckIn] = useState(property.systemDate);
  const [checkOut, setCheckOut] = useState(addDays(property.systemDate, 1));
  const [roomTypeId, setRoomTypeId] = useState(activeRoomTypes[0]?.id ?? "");
  const [ratePlanId, setRatePlanId] = useState(activeRatePlans[0]?.id ?? "");
  const [displayCurrency, setDisplayCurrency] = useState(homeCurrency);
  const [view, setView] = useState<"list" | "table">("list");
  const [searchSnapshot, setSearchSnapshot] = useState<SearchSnapshot | null>(null);
  const [error, setError] = useState("");

  const selectedPlan = ratePlans.find((plan) => plan.id === ratePlanId);
  const currencyOptions = Array.from(new Set([homeCurrency, ...currencies.map((currency) => currency.code)]));

  const comparisons = useMemo<Comparison[]>(() => {
    if (!searchSnapshot) return [];
    const plan = ratePlans.find((item) => item.id === searchSnapshot.ratePlanId);
    if (!plan) return [];
    const dates = stayDates(searchSnapshot.checkIn, searchSnapshot.checkOut);
    const ownNativeTotal = dates.reduce((total, date) => (
      total + (
        inventoryRates[makeInventoryKey(plan.id, searchSnapshot.roomTypeId, date)]
        ?? getPlanRate(plan, searchSnapshot.roomTypeId)
      )
    ), 0);
    const ownTotal = convertCurrency(
      ownNativeTotal,
      plan.currency,
      searchSnapshot.displayCurrency,
      homeCurrency,
      currencies
    );
    if (ownTotal === null) return [];

    return searchSampleCompetitorQuotes(searchSnapshot)
      .map((quote) => {
        const competitorTotal = convertCurrency(
          quote.totalRate,
          quote.currency,
          searchSnapshot.displayCurrency,
          homeCurrency,
          currencies
        );
        if (competitorTotal === null) return null;
        const nights = Math.max(dates.length, 1);
        const difference = competitorTotal - ownTotal;
        const percentage = competitorTotal === 0 ? 0 : Math.abs(difference) / competitorTotal * 100;
        return {
          quote,
          ownAverage: ownTotal / nights,
          ownTotal,
          competitorAverage: competitorTotal / nights,
          competitorTotal,
          difference,
          percentage,
          position: difference > 0 ? "lower" as const : difference < 0 ? "higher" as const : "equal" as const
        };
      })
      .filter((comparison): comparison is Comparison => comparison !== null)
      .sort((left, right) => left.competitorTotal - right.competitorTotal);
  }, [currencies, homeCurrency, inventoryRates, ratePlans, searchSnapshot]);

  function runComparison() {
    setError("");
    const plan = ratePlans.find((item) => item.id === ratePlanId);
    if (!city.trim()) { setError("Enter a city or location."); return; }
    if (!roomTypeId) { setError("Select an active room type."); return; }
    if (!plan) { setError("Select an active rate plan."); return; }
    if (checkOut <= checkIn) { setError("Check-out must be after check-in."); return; }
    const dates = stayDates(checkIn, checkOut);
    if (dates.some((date) => date < plan.validFrom || date > plan.validTo)) {
      setError(`${plan.name} is not valid for every night in the selected stay.`);
      return;
    }
    const testConversion = convertCurrency(1, plan.currency, displayCurrency, homeCurrency, currencies);
    if (testConversion === null) {
      setError(`Configure an exchange rate from ${plan.currency} to ${displayCurrency} in Settings > Property > Currency.`);
      return;
    }
    setSearchSnapshot({
      city: city.trim(),
      country,
      checkIn,
      checkOut,
      mealPlan: plan.mealPlan,
      roomTypeId,
      ratePlanId,
      displayCurrency
    });
    setToast("Rate comparison calculated from PMS rates and sample competitor benchmarks");
  }

  function toggleFavorite(id: string) {
    setFavoriteIds((current) => current.includes(id)
      ? current.filter((favoriteId) => favoriteId !== id)
      : [...current, id]);
  }

  function openExternalSearch(_quote: CompetitorQuote) {
    if (!searchSnapshot) return;
    const params = new URLSearchParams({
      ss: `${searchSnapshot.city}, ${searchSnapshot.country}`,
      checkin: searchSnapshot.checkIn,
      checkout: searchSnapshot.checkOut,
      group_adults: "2",
      no_rooms: "1"
    });
    window.open(`https://www.booking.com/searchresults.html?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  const resultRoomType = roomTypes.find((roomType) => roomType.id === searchSnapshot?.roomTypeId);
  const resultPlan = ratePlans.find((plan) => plan.id === searchSnapshot?.ratePlanId);
  const nights = searchSnapshot ? stayDates(searchSnapshot.checkIn, searchSnapshot.checkOut).length : 0;

  return (
    <RoomsRatesFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Rate Hunter</h1>
          <p className="mt-2 text-sm text-slate-500">Compare your saved PMS rates with normalized competitor benchmarks.</p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
          Live provider not configured
        </span>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Competitor values on this page are clearly marked sample benchmarks. Your hotel values come from Rates and saved Inventory overrides. Do not use sample values as evidence of a competitor&apos;s live selling price.
      </div>

      <Panel>
        {error ? <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="City / Location"><TextInput value={city} onChange={(event) => setCity(event.target.value)} /></Field>
          <Field label="Country">
            <SelectInput value={country} onChange={(event) => setCountry(event.target.value)}>
              {["Sri Lanka", "India", "Maldives", "United Arab Emirates", "Singapore"].map((item) => <option key={item}>{item}</option>)}
            </SelectInput>
          </Field>
          <Field label="Display Currency">
            <SelectInput value={displayCurrency} onChange={(event) => setDisplayCurrency(event.target.value)}>
              {currencyOptions.map((item) => <option key={item}>{item}</option>)}
            </SelectInput>
          </Field>
          <Field label="Check-in Date"><TextInput type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} /></Field>
          <Field label="Check-out Date"><TextInput type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></Field>
          <Field label="Room Type">
            <SelectInput value={roomTypeId} onChange={(event) => setRoomTypeId(event.target.value)}>
              {!activeRoomTypes.length ? <option value="">No active room types</option> : null}
              {activeRoomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Rate Plan" className="lg:col-span-2">
            <SelectInput value={ratePlanId} onChange={(event) => setRatePlanId(event.target.value)}>
              {!activeRatePlans.length ? <option value="">No active rate plans</option> : null}
              {activeRatePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name} - {plan.mealPlan} ({plan.currency})</option>
              ))}
            </SelectInput>
          </Field>
          <div className="flex items-end justify-end">
            <ToolbarButton tone="dark" icon={<Search className="h-4 w-4" />} onClick={runComparison}>
              Run Comparison
            </ToolbarButton>
          </div>
        </div>
        {selectedPlan ? (
          <p className="mt-4 text-xs text-slate-500">
            Comparisons will match the selected plan&apos;s meal basis: <strong>{selectedPlan.mealPlan}</strong>. Exchange rates come from Settings &gt; Property &gt; Currency.
          </p>
        ) : null}
      </Panel>

      {searchSnapshot ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              <strong>{resultRoomType?.name}</strong> · <strong>{resultPlan?.name}</strong> · {searchSnapshot.checkIn} to {searchSnapshot.checkOut} · {nights} night{nights === 1 ? "" : "s"}
            </div>
            <div className="flex gap-2">
              <IconButton label="List view" active={view === "list"} onClick={() => setView("list")}><List className="h-4 w-4" /></IconButton>
              <IconButton label="Table view" active={view === "table"} onClick={() => setView("table")}><Grid3X3 className="h-4 w-4" /></IconButton>
            </div>
          </div>

          <Panel title="Sample competitor benchmarks" subtitle={`${comparisons.length} comparable Room Only benchmark${comparisons.length === 1 ? "" : "s"} found`}>
            {!comparisons.length ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                No comparable sample benchmarks exist for this location and meal plan. A live provider must return like-for-like offers before a real comparison can be shown.
              </div>
            ) : view === "list" ? (
              <div className="space-y-5">
                {comparisons.map((comparison) => (
                  <ComparisonCard
                    key={comparison.quote.id}
                    comparison={comparison}
                    currency={searchSnapshot.displayCurrency}
                    favorite={favoriteIds.includes(comparison.quote.id)}
                    onFavorite={() => toggleFavorite(comparison.quote.id)}
                    onOpen={() => openExternalSearch(comparison.quote)}
                  />
                ))}
              </div>
            ) : (
              <ComparisonTable
                comparisons={comparisons}
                currency={searchSnapshot.displayCurrency}
                favoriteIds={favoriteIds}
                onFavorite={toggleFavorite}
                onOpen={openExternalSearch}
              />
            )}
          </Panel>
        </>
      ) : (
        <Panel>
          <div className="py-10 text-center text-sm text-slate-500">Choose a room type, rate plan and stay dates, then run a comparison.</div>
        </Panel>
      )}
    </RoomsRatesFrame>
  );
}

function ComparisonCard({
  comparison,
  currency,
  favorite,
  onFavorite,
  onOpen
}: {
  comparison: Comparison;
  currency: string;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  const { quote } = comparison;
  const positionText = comparison.position === "equal"
    ? "Your total matches this benchmark"
    : `Your total is ${comparison.percentage.toFixed(1)}% ${comparison.position}`;
  const reviewText = comparison.position === "lower" && comparison.percentage > 15
    ? "Review whether there is room to increase your price."
    : comparison.position === "higher" && comparison.percentage > 15
      ? "Review value and competitiveness before changing price."
      : "Your price is within 15% of this benchmark.";

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <button type="button" onClick={onFavorite} title="Favorite" className={favorite ? "text-rose-500" : "text-slate-300"}>
          <Heart className="h-5 w-5" fill={favorite ? "currentColor" : "none"} />
        </button>
        <div className="grid h-14 w-14 place-items-center rounded-lg bg-sky-100 text-sky-600"><Building2 className="h-7 w-7" /></div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold">{quote.hotelName}</h3>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{quote.source}</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />Sample score {quote.score} · {quote.distanceKm.toFixed(1)} km</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <RateBox label="My PMS rate" average={comparison.ownAverage} total={comparison.ownTotal} currency={currency} />
        <RateBox label="Sample competitor benchmark" average={comparison.competitorAverage} total={comparison.competitorTotal} currency={currency} competitor />
      </div>
      <div className={`mt-4 rounded-md border px-4 py-4 text-sm ${comparison.position === "higher" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
        <p className="font-bold">{positionText}</p>
        <p className="mt-1">{reviewText} Difference: {formatMoney(Math.abs(comparison.difference), currency)}.</p>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
        <div className="text-xs text-slate-500">
          <p>Comparable room: {quote.comparableRoom}</p>
          <p>Meal plan: {quote.mealPlan}</p>
          <p>Terms: {quote.refundable ? "Refundable sample" : "Non-refundable sample"}</p>
        </div>
        <ToolbarButton icon={<ExternalLink className="h-4 w-4" />} onClick={onOpen}>Search marketplace</ToolbarButton>
      </div>
    </section>
  );
}

function RateBox({ label, average, total, currency, competitor = false }: { label: string; average: number; total: number; currency: string; competitor?: boolean }) {
  return (
    <div className={`rounded-lg border p-5 ${competitor ? "border-blue-200 bg-blue-50" : "border-line bg-slate-50"}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${competitor ? "text-blue-700" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-3 text-3xl font-bold ${competitor ? "text-blue-700" : ""}`}>{formatMoney(average, currency)} <span className="text-sm font-medium">/ night</span></p>
      <p className="mt-2 text-sm text-slate-500">Stay total: {formatMoney(total, currency)}</p>
    </div>
  );
}

function ComparisonTable({ comparisons, currency, favoriteIds, onFavorite, onOpen }: {
  comparisons: Comparison[];
  currency: string;
  favoriteIds: string[];
  onFavorite: (id: string) => void;
  onOpen: (quote: CompetitorQuote) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500"><tr>
          {["Hotel", "Comparable Offer", "My Total", "Benchmark Total", "Difference", "Position", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}
        </tr></thead>
        <tbody>{comparisons.map((comparison) => (
          <tr key={comparison.quote.id} className="border-t border-line">
            <td className="px-4 py-3 font-semibold">{comparison.quote.hotelName}<span className="block text-xs font-normal text-amber-700">Sample benchmark</span></td>
            <td className="px-4 py-3">{comparison.quote.comparableRoom}<span className="block text-xs text-slate-500">{comparison.quote.mealPlan}</span></td>
            <td className="px-4 py-3">{formatMoney(comparison.ownTotal, currency)}</td>
            <td className="px-4 py-3">{formatMoney(comparison.competitorTotal, currency)}</td>
            <td className="px-4 py-3">{formatMoney(Math.abs(comparison.difference), currency)}</td>
            <td className="px-4 py-3 capitalize">{comparison.position === "equal" ? "Equal" : `${comparison.percentage.toFixed(1)}% ${comparison.position}`}</td>
            <td className="px-4 py-3"><div className="flex gap-2">
              <ToolbarButton onClick={() => onFavorite(comparison.quote.id)}>{favoriteIds.includes(comparison.quote.id) ? "Unsave" : "Save"}</ToolbarButton>
              <ToolbarButton onClick={() => onOpen(comparison.quote)}>Search</ToolbarButton>
            </div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
