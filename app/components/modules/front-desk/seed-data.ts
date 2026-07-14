import { Reservation, ReservationStatus } from "@/app/data/pms-data";

export const frontDeskSeedReservations: Reservation[] = [
  makeSeedReservation("fd-marsha", "Marsha", "2026-05-29", "2026-05-30", "02", "Deluxe Double Room", "Checked-out", "Agoda", 14500),
  makeSeedReservation("fd-lakshman", "Lakshman", "2026-06-01", "2026-06-02", "02", "Deluxe Double Room", "Checked-out", "Agoda", 14500),
  makeSeedReservation("fd-mohan", "Mohan Ram", "2026-06-01", "2026-06-02", "04", "Deluxe Twin Room", "Checked-out", "Direct", 13200),
  makeSeedReservation("fd-murtaza", "Muhammad Murtaza", "2026-06-02", "2026-06-03", "04", "Deluxe Twin Room", "Checked-in", "Agoda", 13200, {
    resNo: "1052711009",
    bookingRef: "2018941395",
    reservationDate: "2026-06-02"
  }),
  makeSeedReservation("fd-ismail", "Mohamed Ismail", "2026-06-03", "2026-06-04", "02", "Deluxe Double Room", "Checked-in", "Agoda", 15.85, {
    resNo: "1052711014",
    bookingRef: "2018941396",
    reservationDate: "2026-06-03",
    phone: "94 768482447",
    country: "KH",
    paid: 15.85
  }),
  makeSeedReservation("fd-eswaran", "Eswaran M", "2026-06-04", "2026-06-05", "05", "Deluxe Double Room", "Tentative", "Travel Agent", 14500),
  makeSeedReservation("fd-abdul", "MD ABDUL", "2026-06-04", "2026-06-05", "06", "Deluxe Double Room", "Tentative", "Agoda", 14500),
  makeSeedReservation("fd-ibrahim", "Ibrahim Ha", "2026-06-04", "2026-06-05", "09", "Deluxe Double Room", "Tentative", "Agoda", 14500),
  makeSeedReservation("fd-antony", "Antonythas", "2026-06-05", "2026-06-06", "01", "Deluxe Triple Room", "Tentative", "Agoda", 16800),
  makeSeedReservation("fd-lafeer", "M Lafeer", "2026-06-06", "2026-06-07", "01", "Deluxe Triple Room", "Tentative", "Agoda", 16800),
  makeSeedReservation("fd-thishantha", "thishantha", "2026-06-07", "2026-06-08", "05", "Deluxe Double Room", "Tentative", "Agoda", 14500),
  makeSeedReservation("fd-gia", "GIA NY TR", "2026-06-08", "2026-06-09", "05", "Deluxe Double Room", "Tentative", "Travel Agent", 14500),
  makeSeedReservation("fd-thi", "Thishantha", "2026-06-08", "2026-06-09", "06", "Deluxe Double Room", "Tentative", "Agoda", 14500),
  makeSeedReservation("fd-harshal", "harshil hite", "2026-06-09", "2026-06-10", "05", "Deluxe Double Room", "Tentative", "Travel Agent", 14500),
  makeSeedReservation("fd-urara", "Urara Mago", "2026-06-09", "2026-06-10", "04", "Deluxe Twin Room", "Tentative", "Agoda", 13200),
  makeSeedReservation("fd-kandasamy", "Kandasamy", "2026-06-10", "2026-06-11", "05", "Deluxe Double Room", "Tentative", "Agoda", 14500),
  makeSeedReservation("fd-fnu", "FNU HASS", "2026-06-11", "2026-06-12", "05", "Deluxe Double Room", "Tentative", "Travel Agent", 14500)
];

function makeSeedReservation(
  id: string,
  guest: string,
  checkIn: string,
  checkOut: string,
  room: string,
  roomType: string,
  status: ReservationStatus,
  source: string,
  total: number,
  overrides: Partial<Reservation> = {}
): Reservation {
  const booking: Reservation = {
    id,
    resNo: id.replace("fd-", "10528"),
    bookingRef: id.replace("fd-", "FD-").toUpperCase(),
    reservationDate: "2026-05-28",
    checkIn,
    checkOut,
    rooms: 1,
    source,
    status,
    guest,
    phone: "-",
    email: "-",
    country: "Sri Lanka",
    roomType,
    room,
    adults: 2,
    children: 0,
    total,
    paid: status === "Checked-out" ? total : 0
  };

  return { ...booking, ...overrides };
}
