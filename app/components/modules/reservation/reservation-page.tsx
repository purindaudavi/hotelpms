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

  if (path.endsWith("create-event")) return <EventBookingsPage {...props} />;
  if (path.endsWith("cross-booking")) return <CrossBookingPage {...props} />;
  if (path.endsWith("arrivals")) return <MovementPage {...props} kind="arrivals" />;
  if (path.endsWith("departures")) return <MovementPage {...props} kind="departures" />;
  if (path.endsWith("in-house")) return <MovementPage {...props} kind="in-house" />;
  if (path.endsWith("travel-agents")) return <TravelAgentsPage {...props} />;
  if (path.endsWith("guest-profile")) return <GuestProfilesPage {...props} />;

  return <BookingsPage {...props} />;
}
