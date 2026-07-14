import { Reservation } from "@/app/data/pms-data";

export function sumGuests(bookings: Reservation[]) {
  return bookings.reduce((total, booking) => total + booking.adults + booking.children, 0);
}

export function chartCurrency(value: number) {
  return `LKR ${value.toLocaleString("en-US")}`;
}
