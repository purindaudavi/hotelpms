"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, UserRound } from "lucide-react";
import {
  getGuestApiErrorMessage,
  getGuestCountries,
  listGuests,
  type GuestProfile
} from "@/app/lib/guest-api";
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
  ToolbarButton
} from "../components/reservation-ui";
import { guestDisplayValue } from "./guest-profile-data";

const PAGE_SIZE = 10;

export function GuestProfilesPage({ propertyId, setToast }: ReservationModuleProps) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("All");
  const [email, setEmail] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [profiles, setProfiles] = useState<GuestProfile[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGuestCountries(propertyId)
      .then((items) => {
        if (!cancelled) setCountries(items);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, reload]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError("");
      listGuests(propertyId, {
        search: query.trim(),
        country,
        email: email.trim(),
        page,
        limit: PAGE_SIZE
      })
        .then((result) => {
          if (cancelled) return;
          setProfiles(result.guests);
          setTotal(result.total);
          setTotalPages(result.pages);
          if (page > result.pages) setPage(result.pages);
        })
        .catch((requestError) => {
          if (cancelled) return;
          setProfiles([]);
          setTotal(0);
          setTotalPages(1);
          setError(getGuestApiErrorMessage(requestError));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [country, email, page, propertyId, query, reload]);

  const visibleProfiles = useMemo(
    () => [...profiles].sort((left, right) =>
      sortAsc
        ? left.name.localeCompare(right.name)
        : right.name.localeCompare(left.name)
    ),
    [profiles, sortAsc]
  );
  const selectedProfile =
    profiles.find((profile) => profile._id === selectedProfileId) ?? null;

  function resetPage() {
    setPage(1);
  }

  function refresh() {
    setReload((value) => value + 1);
    setToast("Refreshing guest profiles from MongoDB");
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
            placeholder="Search by name, phone, country or email..."
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
            <option>All</option>
            {countries.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Filter by Email">
          <SearchBox
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              resetPage();
            }}
            placeholder="Enter all or part of an email..."
          />
        </Field>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Panel
        title="Guest Profiles"
        subtitle={`${total} guest profile${total === 1 ? "" : "s"} stored in MongoDB`}
        bodyClassName="p-0"
        action={
          <ToolbarButton disabled={loading} onClick={refresh}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </ToolbarButton>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => setSortAsc((current) => !current)}
                    className="font-semibold"
                  >
                    Name {sortAsc ? "^" : "v"}
                  </button>
                </th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Country</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProfiles.map((profile) => (
                <tr
                  key={profile._id}
                  onDoubleClick={() => setSelectedProfileId(profile._id)}
                  className="cursor-pointer border-t border-line hover:bg-slate-50"
                  title="Double-click to view guest contact details"
                >
                  <td className="px-5 py-3 font-medium">{profile.name}</td>
                  <td className="px-5 py-3">{guestDisplayValue(profile.phone)}</td>
                  <td className="px-5 py-3">{guestDisplayValue(profile.country)}</td>
                  <td className="px-5 py-3">{guestDisplayValue(profile.email)}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      title="View profile"
                      aria-label={`View ${profile.name}`}
                      onClick={() => setSelectedProfileId(profile._id)}
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
        {loading ? <EmptyState>Loading guest profiles...</EmptyState> : null}
        {!loading && !visibleProfiles.length ? (
          <EmptyState>No guest profiles match the current filters.</EmptyState>
        ) : null}
      </Panel>

      <div className="flex items-center justify-center gap-4 text-sm">
        <ToolbarButton
          disabled={page === 1 || loading}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          {"< Previous"}
        </ToolbarButton>
        <span className="font-semibold">
          Page {page} of {totalPages}
        </span>
        <ToolbarButton
          disabled={page === totalPages || loading}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
        >
          {"Next >"}
        </ToolbarButton>
      </div>

      {selectedProfile ? (
        <GuestProfileDrawer
          profile={selectedProfile}
          onClose={() => setSelectedProfileId(null)}
        />
      ) : null}
    </ReservationPageFrame>
  );
}

function GuestProfileDrawer({
  profile,
  onClose
}: {
  profile: GuestProfile;
  onClose: () => void;
}) {
  return (
    <Drawer title="Guest Profile" onClose={onClose} width="max-w-2xl">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-lg font-bold text-white">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{profile.name}</h3>
            <p className="text-sm text-slate-500">
              {guestDisplayValue(profile.country)}
            </p>
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
              { label: "Email", value: guestDisplayValue(profile.email) }
            ]}
          />
        </section>
      </div>
    </Drawer>
  );
}
