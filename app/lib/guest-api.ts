import type { Reservation } from "@/app/data/pms-data";
import { api, getApiErrorMessage } from "./api";

export type GuestProfile = {
  _id: string;
  property_id: string;
  name: string;
  phone: string;
  country: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type GuestProfileInput = {
  name: string;
  phone: string;
  country: string;
  email: string;
};

export type GuestListResponse = {
  count: number;
  total: number;
  page: number;
  pages: number;
  guests: GuestProfile[];
};

export type GuestListOptions = {
  search?: string;
  country?: string;
  email?: string;
  page?: number;
  limit?: number;
};

type GuestResponse = {
  message?: string;
  guest: GuestProfile;
};

export async function listGuests(propertyId: string, options: GuestListOptions = {}) {
  const response = await api.get<GuestListResponse>("/guests", {
    params: {
      property_id: propertyId,
      search: options.search || undefined,
      country: options.country && options.country !== "All" ? options.country : undefined,
      email: options.email || undefined,
      page: options.page ?? 1,
      limit: options.limit ?? 10
    }
  });
  return response.data;
}

export async function getGuestCountries(propertyId: string) {
  const response = await listGuests(propertyId, { page: 1, limit: 100 });
  return Array.from(
    new Set(response.guests.map((guest) => guest.country.trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));
}

export async function createGuest(propertyId: string, guest: GuestProfileInput) {
  const response = await api.post<GuestResponse>("/guests", {
    property_id: propertyId,
    ...guest
  });
  return response.data.guest;
}

export async function updateGuest(
  propertyId: string,
  guestId: string,
  guest: Partial<GuestProfileInput>
) {
  const response = await api.patch<GuestResponse>(
    `/guests/${guestId}`,
    guest,
    { params: { property_id: propertyId } }
  );
  return response.data.guest;
}

export async function syncReservationGuest(
  propertyId: string,
  reservation: Reservation,
  previousReservation?: Reservation
) {
  const input = reservationGuestInput(reservation);
  if (!input) {
    return {
      synced: false as const,
      reason: "name, phone, country and a valid email are required"
    };
  }

  const previousEmail = previousReservation
    ? reservationGuestInput(previousReservation)?.email
    : "";
  const existing =
    (previousEmail ? await findGuestByEmail(propertyId, previousEmail) : null) ||
    await findGuestByEmail(propertyId, input.email);
  if (existing) {
    return {
      synced: true as const,
      guest: await updateGuest(propertyId, existing._id, input)
    };
  }

  try {
    return {
      synced: true as const,
      guest: await createGuest(propertyId, input)
    };
  } catch (error) {
    const duplicate = await findGuestByEmail(propertyId, input.email);
    if (!duplicate) throw error;
    return {
      synced: true as const,
      guest: await updateGuest(propertyId, duplicate._id, input)
    };
  }
}

export function getGuestApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Guest profiles could not be loaded.");
}

async function findGuestByEmail(propertyId: string, email: string) {
  const result = await listGuests(propertyId, { email, page: 1, limit: 10 });
  return result.guests.find(
    (guest) => guest.email.trim().toLowerCase() === email
  );
}

function reservationGuestInput(reservation: Reservation): GuestProfileInput | null {
  const name = cleanRequiredValue(reservation.guest);
  const phone = cleanRequiredValue(reservation.phone);
  const country = cleanRequiredValue(reservation.country);
  const email = cleanRequiredValue(reservation.email).toLowerCase();

  if (!name || !phone || !country || !isValidEmail(email)) return null;
  return { name, phone, country, email };
}

function cleanRequiredValue(value?: string) {
  const cleaned = value?.trim() ?? "";
  const missing = new Set(["", "-", "n/a", "na", "none", "select country"]);
  return missing.has(cleaned.toLowerCase()) ? "" : cleaned;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
