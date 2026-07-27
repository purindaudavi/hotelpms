"use client";

import { useMemo, useState } from "react";
import { Eye, UserRound } from "lucide-react";
import type { ReservationModuleProps } from "../types";
import {
  DetailGrid,
  Drawer,
  EmptyState,
  Field,
  Panel,
  ReservationPageFrame,
  SearchBox,
  SelectInput,
  StatusPill,
  ToolbarButton
} from "../components/reservation-ui";
import { formatShortDate } from "../utils";
import { buildGuestProfiles, guestDisplayValue, type ReservationGuestProfile } from "./guest-profile-data";

const PAGE_SIZE = 10;

export function GuestProfilesPage({ reservations }: ReservationModuleProps) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("All");
  const [emailFilter, setEmailFilter] = useState("All");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const profiles = useMemo(() => buildGuestProfiles(reservations), [reservations]);
  const countries = useMemo(
    () => ["All", ...Array.from(new Set(profiles.map((profile) => profile.country).filter(Boolean))).sort()],
    [profiles]
  );

  const filteredProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return profiles
      .filter((profile) => {
        if (country !== "All" && profile.country !== country) return false;
        if (emailFilter === "With email" && !profile.email) return false;
        if (emailFilter === "Without email" && profile.email) return false;
        if (!needle) return true;

        return [
          profile.name,
          profile.phone,
          profile.country,
          profile.email,
          ...profile.reservations.flatMap((reservation) => [reservation.resNo, reservation.bookingRef, reservation.room])
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [country, emailFilter, profiles, query, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleProfiles = filteredProfiles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  function resetPage() {
    setPage(1);
  }

  return (
    <ReservationPageFrame>
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Search">
          <SearchBox
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="Search by name, phone, country, email or reservation..."
          />
        </Field>
        <Field label="Filter by Country">
          <SelectInput
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              resetPage();
            }}
          >
            {countries.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Filter by Email">
          <SelectInput
            value={emailFilter}
            onChange={(event) => {
              setEmailFilter(event.target.value);
              resetPage();
            }}
          >
            <option>All</option>
            <option>With email</option>
            <option>Without email</option>
          </SelectInput>
        </Field>
      </div>

      <Panel
        title="Guest Profiles"
        subtitle={`${filteredProfiles.length} unique guest${filteredProfiles.length === 1 ? "" : "s"} from saved reservations`}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="min-w-[900px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">
                  <button type="button" onClick={() => setSortAsc((current) => !current)} className="font-semibold">
                    Name {sortAsc ? "^" : "v"}
                  </button>
                </th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Country</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Reservations</th>
                <th className="px-5 py-3 font-semibold">Latest stay</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProfiles.map((profile) => (
                <tr
                  key={profile.id}
                  onDoubleClick={() => setSelectedProfileId(profile.id)}
                  className="cursor-pointer border-t border-line hover:bg-slate-50"
                  title="Double-click to view guest history"
                >
                  <td className="px-5 py-3 font-medium">{profile.name}</td>
                  <td className="px-5 py-3">{guestDisplayValue(profile.phone)}</td>
                  <td className="px-5 py-3">{guestDisplayValue(profile.country)}</td>
                  <td className="px-5 py-3">{guestDisplayValue(profile.email)}</td>
                  <td className="px-5 py-3">{profile.reservations.length}</td>
                  <td className="px-5 py-3">{formatShortDate(profile.latestStay)}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      title="View profile"
                      aria-label={`View ${profile.name}`}
                      onClick={() => setSelectedProfileId(profile.id)}
                      className="text-emerald-500 hover:text-emerald-600"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleProfiles.length ? <EmptyState>No guest profiles match the current filters.</EmptyState> : null}
      </Panel>

      <div className="flex items-center justify-center gap-4 text-sm">
        <ToolbarButton disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
          {"< Previous"}
        </ToolbarButton>
        <span className="font-semibold">
          Page {currentPage} of {totalPages}
        </span>
        <ToolbarButton disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
          {"Next >"}
        </ToolbarButton>
      </div>

      {selectedProfile ? <GuestProfileDrawer profile={selectedProfile} onClose={() => setSelectedProfileId(null)} /> : null}
    </ReservationPageFrame>
  );
}

function GuestProfileDrawer({ profile, onClose }: { profile: ReservationGuestProfile; onClose: () => void }) {
  return (
    <Drawer title="Guest Profile" onClose={onClose} width="max-w-2xl">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-lg font-bold text-white">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{profile.name}</h3>
            <p className="text-sm text-slate-500">{guestDisplayValue(profile.country)}</p>
          </div>
        </div>

        <section className="rounded-lg border border-line p-4">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <UserRound className="h-5 w-5" />
            Contact Information
          </h3>
          <DetailGrid
            items={[
              { label: "Name", value: profile.name },
              { label: "Phone", value: guestDisplayValue(profile.phone) },
              { label: "Country", value: guestDisplayValue(profile.country) },
              { label: "Email", value: guestDisplayValue(profile.email) },
              { label: "Reservations", value: profile.reservations.length },
              { label: "Room Nights", value: profile.roomNights }
            ]}
          />
        </section>

        <section className="rounded-lg border border-line p-4">
          <h3 className="mb-4 text-lg font-semibold">Reservation History</h3>
          <div className="space-y-3">
            {profile.reservations.map((reservation) => (
              <article key={reservation.id} className="rounded-md border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">Reservation {reservation.resNo}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatShortDate(reservation.checkIn)} - {formatShortDate(reservation.checkOut)} · Room {guestDisplayValue(reservation.room)}
                    </p>
                  </div>
                  <StatusPill status={reservation.status} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Drawer>
  );
}
