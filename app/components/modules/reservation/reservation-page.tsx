"use client";

import { BookingsPage } from "./bookings/bookings-page";
import { EventBookingsPage } from "./create-event/event-bookings-page";
import { CrossBookingPage } from "./cross-booking/cross-booking-page";
import { GuestProfilesPage } from "./guest-profile/guest-profiles-page";
import { MovementPage } from "./movement/movement-page";
import { TravelAgentsPage } from "./travel-agents/travel-agents-page";
import type { ReservationModuleProps } from "./types";

export function ReservationPage(props: ReservationModuleProps) {
  const path = props.activePath;
  const pathParts = path.split("/").filter(Boolean);
  const section = pathParts[1] || "bookings";
  const initialReference = pathParts[2] ? decodeURIComponent(pathParts[2]) : "";

  if (section === "create-event") return <EventBookingsPage {...props} />;
  if (section === "cross-booking") return <CrossBookingPage {...props} />;
  if (section === "arrivals") return <MovementPage {...props} kind="arrivals" />;
  if (section === "departures") return <MovementPage {...props} kind="departures" />;
  if (section === "in-house") return <MovementPage {...props} kind="in-house" />;
  if (section === "travel-agents") return <TravelAgentsPage {...props} />;
  if (section === "guest-profile") return <GuestProfilesPage {...props} />;

  return <BookingsPage key={`${section}:${initialReference || "bookings"}`} {...props} initialReference={initialReference} initialTab={section === "business-blocks" ? "business-blocks" : "reservations"} />;
}
