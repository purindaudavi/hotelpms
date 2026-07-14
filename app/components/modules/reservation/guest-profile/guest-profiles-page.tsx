"use client";

import { useMemo, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { Eye, Link2, UserRound } from "lucide-react";
import { initialGuestProfiles } from "../constants";
import type { GuestProfile, ReservationModuleProps } from "../types";
import { DetailGrid, Drawer, Field, Panel, ReservationPageFrame, SearchBox, SelectInput, ToolbarButton } from "../components/reservation-ui";

export function GuestProfilesPage({ propertyId, reservations, setToast }: ReservationModuleProps) {
  const [profiles, setProfiles] = useSessionState(`staypilot:${propertyId}:reservation:guest-profiles`, initialGuestProfiles);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("All");
  const [email, setEmail] = useState("All");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<GuestProfile | null>(null);

  const countries = useMemo(() => ["All", ...Array.from(new Set(profiles.map((profile) => profile.country)))], [profiles]);
  const emails = useMemo(() => ["All", ...Array.from(new Set(profiles.map((profile) => profile.email)))], [profiles]);
  const filteredProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return profiles
      .filter((profile) => {
        if (country !== "All" && profile.country !== country) return false;
        if (email !== "All" && profile.email !== email) return false;
        if (!needle) return true;
        return [profile.passport, profile.name, profile.phone, profile.country, profile.email].join(" ").toLowerCase().includes(needle);
      })
      .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [country, email, profiles, query, sortAsc]);

  function toggleProfileLink(profile: GuestProfile) {
    const firstReservation = reservations[0]?.resNo ?? "1052711014";
    const alreadyLinked = profile.linkedReservationIds.includes(firstReservation);
    const nextProfile = {
      ...profile,
      linkedReservationIds: alreadyLinked
        ? profile.linkedReservationIds.filter((item) => item !== firstReservation)
        : [...profile.linkedReservationIds, firstReservation]
    };
    setProfiles((current) => current.map((item) => (item.id === profile.id ? nextProfile : item)));
    setSelectedProfile((current) => (current?.id === profile.id ? nextProfile : current));
    setToast(alreadyLinked ? "Guest profile unlinked" : "Guest profile linked to reservation");
  }

  return (
    <ReservationPageFrame>
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Search">
          <SearchBox value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, passport, country, email..." />
        </Field>
        <Field label="Filter by Country">
          <SelectInput value={country} onChange={(event) => setCountry(event.target.value)}>
            {countries.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Filter by Email">
          <SelectInput value={email} onChange={(event) => setEmail(event.target.value)}>
            {emails.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <Panel title="Guest Profiles" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Passport</th>
                <th className="px-5 py-3 font-semibold">
                  <button type="button" onClick={() => setSortAsc((current) => !current)} className="font-semibold">
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
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="border-t border-line">
                  <td className="px-5 py-3">{profile.passport}</td>
                  <td className="px-5 py-3">{profile.name}</td>
                  <td className="px-5 py-3">{profile.phone}</td>
                  <td className="px-5 py-3">{profile.country}</td>
                  <td className="px-5 py-3">{profile.email}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button type="button" title="View profile" onClick={() => setSelectedProfile(profile)} className="text-emerald-500 hover:text-emerald-600">
                        <Eye className="h-5 w-5" />
                      </button>
                      <button type="button" title="Link profile" onClick={() => toggleProfileLink(profile)} className="text-blue-500 hover:text-blue-600">
                        <Link2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="flex items-center justify-center gap-4 text-sm">
        <ToolbarButton disabled>{"< Previous"}</ToolbarButton>
        <span className="font-semibold">Page 1 of 1</span>
        <ToolbarButton disabled>{"Next >"}</ToolbarButton>
      </div>

      {selectedProfile ? <GuestProfileDrawer profile={selectedProfile} onClose={() => setSelectedProfile(null)} onToggleLink={() => toggleProfileLink(selectedProfile)} /> : null}
    </ReservationPageFrame>
  );
}

function GuestProfileDrawer({ profile, onClose, onToggleLink }: { profile: GuestProfile; onClose: () => void; onToggleLink: () => void }) {
  return (
    <Drawer title="Guest Profile" onClose={onClose} width="max-w-xl">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-lg font-bold text-white">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{profile.name}</h3>
            <p className="text-sm text-slate-500">{profile.country}</p>
          </div>
        </div>

        <section className="rounded-lg border border-line p-4">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <UserRound className="h-5 w-5" />
            Basic Information
          </h3>
          <DetailGrid
            items={[
              { label: "Passport", value: profile.passport },
              { label: "Name", value: profile.name },
              { label: "Phone", value: profile.phone },
              { label: "Country", value: profile.country },
              { label: "Email", value: profile.email },
              { label: "Linked Reservations", value: profile.linkedReservationIds.length ? profile.linkedReservationIds.join(", ") : "None" }
            ]}
          />
        </section>

        <section className="rounded-lg border border-line p-4">
          <h3 className="mb-4 text-lg font-semibold">Reservation Links</h3>
          <p className="text-sm text-slate-500">
            Use this action to attach or detach the profile from the latest reservation in the current property.
          </p>
          <button type="button" onClick={onToggleLink} className="mt-4 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            {profile.linkedReservationIds.length ? "Unlink profile" : "Link to reservation"}
          </button>
        </section>
      </div>
    </Drawer>
  );
}
