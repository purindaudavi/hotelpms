import type { Reservation } from "@/app/data/pms-data";

export type ReservationGuestProfile = {
  id: string;
  name: string;
  phone: string;
  country: string;
  email: string;
  latestStay: string;
  roomNights: number;
  reservations: Reservation[];
};

type GuestProfileAccumulator = ReservationGuestProfile & {
  normalizedEmails: Set<string>;
  normalizedPhones: Set<string>;
};

const missingValues = new Set(["", "-", "n/a", "na", "none", "select country"]);

function cleanValue(value?: string) {
  const cleaned = value?.trim() ?? "";
  return missingValues.has(cleaned.toLowerCase()) ? "" : cleaned;
}

function normalizeEmail(value?: string) {
  return cleanValue(value).toLowerCase();
}

function normalizePhone(value?: string) {
  return cleanValue(value).replace(/\D/g, "");
}

function normalizeName(value?: string) {
  return cleanValue(value).toLowerCase().replace(/\s+/g, " ");
}

function stayNights(reservation: Reservation) {
  const checkIn = new Date(`${reservation.checkIn}T00:00:00`).getTime();
  const checkOut = new Date(`${reservation.checkOut}T00:00:00`).getTime();
  if (!Number.isFinite(checkIn) || !Number.isFinite(checkOut)) return 0;
  return Math.max(Math.round((checkOut - checkIn) / 86_400_000), 0) * Math.max(reservation.rooms, 1);
}

export function guestDisplayValue(value?: string) {
  return cleanValue(value) || "Not provided";
}

export function buildGuestProfiles(reservations: Reservation[]): ReservationGuestProfile[] {
  const profiles: GuestProfileAccumulator[] = [];
  const oldestFirst = [...reservations].sort(
    (a, b) => a.reservationDate.localeCompare(b.reservationDate) || a.checkIn.localeCompare(b.checkIn)
  );

  for (const reservation of oldestFirst) {
    const name = cleanValue(reservation.guest) || "Unnamed guest";
    const email = cleanValue(reservation.email);
    const phone = cleanValue(reservation.phone);
    const country = cleanValue(reservation.country);
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const normalizedName = normalizeName(name);

    const matchingProfiles = profiles.filter(
      (profile) =>
        (normalizedEmail && profile.normalizedEmails.has(normalizedEmail)) ||
        (normalizedPhone && profile.normalizedPhones.has(normalizedPhone) && normalizeName(profile.name) === normalizedName)
    );
    let profile = matchingProfiles[0];

    if (!profile) {
      profile = {
        id: `guest-${reservation.id}`,
        name,
        phone,
        country,
        email,
        latestStay: reservation.checkOut || reservation.checkIn,
        roomNights: 0,
        reservations: [],
        normalizedEmails: new Set<string>(),
        normalizedPhones: new Set<string>()
      };
      profiles.push(profile);
    }

    for (const duplicate of matchingProfiles.slice(1)) {
      profile.reservations.push(...duplicate.reservations);
      profile.roomNights += duplicate.roomNights;
      duplicate.normalizedEmails.forEach((value) => profile.normalizedEmails.add(value));
      duplicate.normalizedPhones.forEach((value) => profile.normalizedPhones.add(value));
      profiles.splice(profiles.indexOf(duplicate), 1);
    }

    if (normalizedEmail) profile.normalizedEmails.add(normalizedEmail);
    if (normalizedPhone) profile.normalizedPhones.add(normalizedPhone);

    profile.name = name;
    if (phone) profile.phone = phone;
    if (email) profile.email = email;
    if (country) profile.country = country;
    profile.latestStay = [profile.latestStay, reservation.checkOut || reservation.checkIn].sort().at(-1) ?? "";
    profile.roomNights += stayNights(reservation);
    profile.reservations.push(reservation);
  }

  return profiles.map(({ normalizedEmails: _emails, normalizedPhones: _phones, ...profile }) => ({
    ...profile,
    reservations: profile.reservations.sort(
      (a, b) => b.checkIn.localeCompare(a.checkIn) || b.reservationDate.localeCompare(a.reservationDate)
    )
  }));
}
