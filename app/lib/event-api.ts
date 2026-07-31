import type { EventBooking } from "@/app/components/modules/reservation/types";
import { api, getApiErrorMessage } from "./api";
import { currentSessionUser } from "./current-user";

type ApiEventStatus = "confirmed" | "tentative" | "blocked";

type ApiEvent = {
  _id: string;
  property_id: string;
  title: string;
  venue: string;
  event_date: string;
  start_time: string;
  end_time: string;
  owner: string;
  status: ApiEventStatus;
  description?: string;
  created_at: string;
  updated_at: string;
  version: number;
};

type EventListResponse = {
  count: number;
  total: number;
  page: number;
  pages: number;
  events: ApiEvent[];
};

type EventResponse = {
  message: string;
  event: ApiEvent;
};

export type EventListOptions = {
  dateFrom: string;
  dateTo: string;
  venue?: string;
};

const statusFromApi: Record<ApiEventStatus, EventBooking["status"]> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  blocked: "Blocked"
};

const statusToApi: Record<EventBooking["status"], ApiEventStatus> = {
  Confirmed: "confirmed",
  Tentative: "tentative",
  Blocked: "blocked"
};

export async function listEvents(
  propertyId: string,
  options: EventListOptions
) {
  const response = await api.get<EventListResponse>("/events", {
    params: {
      property_id: propertyId,
      date_from: options.dateFrom,
      date_to: options.dateTo,
      venue:
        options.venue && options.venue !== "All venues"
          ? options.venue
          : undefined,
      limit: 200
    }
  });

  return {
    ...response.data,
    events: response.data.events.map(mapEvent)
  };
}

export async function createEvent(
  propertyId: string,
  event: EventBooking
) {
  const response = await api.post<EventResponse>(
    "/events",
    eventPayload(propertyId, event),
    { headers: actorHeaders() }
  );
  return mapEvent(response.data.event);
}

export async function updateEvent(
  propertyId: string,
  event: EventBooking
) {
  const response = await api.patch<EventResponse>(
    `/events/${event.id}`,
    eventPayload(propertyId, event),
    { headers: actorHeaders() }
  );
  return mapEvent(response.data.event);
}

export async function deleteEvent(propertyId: string, eventId: string) {
  await api.delete(`/events/${eventId}`, {
    params: { property_id: propertyId },
    headers: actorHeaders()
  });
}

export function getEventApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "The event request could not be completed.");
}

function mapEvent(event: ApiEvent): EventBooking {
  return {
    id: event._id,
    title: event.title,
    venue: event.venue,
    date: event.event_date.slice(0, 10),
    start: event.start_time,
    end: event.end_time,
    owner: event.owner,
    status: statusFromApi[event.status] ?? "Tentative"
  };
}

function eventPayload(propertyId: string, event: EventBooking) {
  return {
    property_id: propertyId,
    title: event.title,
    venue: event.venue,
    event_date: event.date,
    start_time: event.start,
    end_time: event.end,
    owner: event.owner,
    status: statusToApi[event.status]
  };
}

function actorHeaders() {
  return {
    "x-user-id": currentSessionUser.email,
    "x-user-name": currentSessionUser.name,
    "x-user-email": currentSessionUser.email
  };
}
