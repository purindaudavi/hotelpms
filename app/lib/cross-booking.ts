import type { CrossBookLink } from "@/app/components/modules/reservation/types";

export function crossBookedRoomCodes(links: CrossBookLink[], roomCode: string) {
  const linkedRooms = new Set<string>();

  links.forEach((link) => {
    if (link.primaryRoom === roomCode) {
      link.blockedRooms.forEach((blockedRoom) => linkedRooms.add(blockedRoom));
    }
    if (link.blockedRooms.includes(roomCode)) linkedRooms.add(link.primaryRoom);
  });

  linkedRooms.delete(roomCode);
  return Array.from(linkedRooms);
}

export function roomsAreCrossBooked(links: CrossBookLink[], firstRoom: string, secondRoom: string) {
  return crossBookedRoomCodes(links, firstRoom).includes(secondRoom);
}
