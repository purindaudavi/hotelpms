import type { HousekeepingActivity, HousekeepingAttendant, HousekeepingReservation } from "./types";

export const HOUSEKEEPING_SYSTEM_DATE = "2026-06-03";
export const HOUSEKEEPING_TODAY = "2026-06-16";

export const initialAttendants: HousekeepingAttendant[] = [
  {
    id: "hk-aa",
    employeeNo: "HK-001",
    name: "aa",
    department: "Housekeeping",
    status: "active",
    phone: "",
    email: "",
    joinedIso: "2026-06-16T09:41:52.453Z"
  }
];

export const initialAttendantByRoom: Record<string, string> = {
  r02: "aa",
  r04: "aa",
  r05: "aa",
  r09: "aa",
  r15: "aa"
};

export const housekeepingReservations: HousekeepingReservation[] = [
  { id: "hk-res-01", bookingId: "1052711005", guest: "Manujaya Geewinda", room: "02", roomType: "Deluxe Double Room", status: "checked-out", stayFrom: "May 28, 2026", stayTo: "May 29, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-02", bookingId: "1052711006", guest: "Lakshman Senarathne", room: "02", roomType: "Deluxe Double Room", status: "checked-out", stayFrom: "May 31, 2026", stayTo: "Jun 01, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-03", bookingId: "1052711008", guest: "Mohan Ramu", room: "04", roomType: "Deluxe Twin Room", status: "checked-out", stayFrom: "May 31, 2026", stayTo: "Jun 01, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-04", bookingId: "1052711009", guest: "Muhammad Murtaza", room: "04", roomType: "Deluxe Twin Room", status: "checked-in", stayFrom: "Jun 02, 2026", stayTo: "Jun 03, 2026", nights: 1, guests: 2, country: "-", group: "departure" },
  { id: "hk-res-05", bookingId: "1052711010", guest: "Antonythas Amal Sinthuyan", room: "01", roomType: "Deluxe Triple Room", status: "tentative", stayFrom: "Jun 05, 2026", stayTo: "Jun 06, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-06", bookingId: "1052711013", guest: "M Lafeer", room: "01", roomType: "Deluxe Triple Room", status: "tentative", stayFrom: "Jun 06, 2026", stayTo: "Jun 07, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-07", bookingId: "1052711014", guest: "Mohamed Ismail", room: "02", roomType: "Deluxe Double Room", status: "checked-in", stayFrom: "Jun 03, 2026", stayTo: "Jun 04, 2026", nights: 1, guests: 2, country: "-", group: "in-house" },
  { id: "hk-res-08", bookingId: "1052711015", guest: "Mohammad Zahangir Alam", room: "04", roomType: "Deluxe Twin Room", status: "tentative", stayFrom: "Jun 04, 2026", stayTo: "Jun 05, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-09", bookingId: "1052711016", guest: "harshil hiteshbhai hingu", room: "02", roomType: "Deluxe Double Room", status: "tentative", stayFrom: "Jun 09, 2026", stayTo: "Jun 10, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-10", bookingId: "1052711017", guest: "Eswaran Mylsamy", room: "02", roomType: "Deluxe Double Room", status: "tentative", stayFrom: "Jun 04, 2026", stayTo: "Jun 05, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-11", bookingId: "1052711018", guest: "MD ABDULLAH", room: "05", roomType: "Deluxe Double Room", status: "tentative", stayFrom: "Jun 04, 2026", stayTo: "Jun 05, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-12", bookingId: "1052711020", guest: "Mohammad Zahangir Alam", room: "04", roomType: "Deluxe Twin Room", status: "tentative", stayFrom: "Jun 05, 2026", stayTo: "Jun 06, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-13", bookingId: "1052711024", guest: "GIA NY TRAN", room: "02", roomType: "Deluxe Double Room", status: "tentative", stayFrom: "Jun 08, 2026", stayTo: "Jun 09, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-14", bookingId: "1052711026", guest: "thishanthan rajendra", room: "02", roomType: "Deluxe Double Room", status: "tentative", stayFrom: "Jun 07, 2026", stayTo: "Jun 08, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-15", bookingId: "1052711027", guest: "Urara Magosaki", room: "04", roomType: "Deluxe Twin Room", status: "tentative", stayFrom: "Jun 09, 2026", stayTo: "Jun 10, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-16", bookingId: "1052711028", guest: "Lokeesan Mahenthiran", room: "04", roomType: "Deluxe Twin Room", status: "tentative", stayFrom: "Jun 07, 2026", stayTo: "Jun 08, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-17", bookingId: "1052711029", guest: "Thishanthan Rajendra", room: "05", roomType: "Deluxe Double Room", status: "tentative", stayFrom: "Jun 08, 2026", stayTo: "Jun 09, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-18", bookingId: "1052711030", guest: "Ragunathan Nirojan", room: "02", roomType: "Deluxe Double Room", status: "tentative", stayFrom: "Jun 12, 2026", stayTo: "Jun 13, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-19", bookingId: "1052711032", guest: "FNU HASSAM UR RIAZ", room: "02", roomType: "Deluxe Double Room", status: "tentative", stayFrom: "Jun 11, 2026", stayTo: "Jun 12, 2026", nights: 1, guests: 2, country: "-", group: "other" },
  { id: "hk-res-20", bookingId: "1052711033", guest: "Kandasamy Muraleetharan", room: "02", roomType: "Deluxe Double Room", status: "tentative", stayFrom: "Jun 10, 2026", stayTo: "Jun 11, 2026", nights: 1, guests: 2, country: "-", group: "other" }
];

export const initialActivities: HousekeepingActivity[] = Array.from({ length: 28 }, (_, index) => {
  const roomCode = index % 2 === 0 ? "02" : "04";
  return {
    id: `hk-act-${index + 1}`,
    roomCode,
    roomType: roomCode === "02" ? "Deluxe Double Room" : "Deluxe Twin Room",
    attendant: "aa",
    status: index < 14 ? "Clean" : "WIP",
    state: index < 14 ? "Completed" : "Started",
    createdAt: `Jun 11, ${index < 4 ? "1:26" : "1:25"} PM`,
    finishedAt: index < 14 ? `Jun 11, ${index < 4 ? "1:26" : "1:25"} PM` : undefined
  };
});
