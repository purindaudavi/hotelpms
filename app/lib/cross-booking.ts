import type { CrossBookLink } from "@/app/components/modules/reservation/types";

export function crossBookLinksStorageKey(propertyId: string) {
  return `staypilot:${propertyId}:reservation:cross-booking:links`;
}

export function isCrossBookLinkArray(value: unknown): value is CrossBookLink[] {
  return Array.isArray(value) && value.every((link) =>
    Boolean(link) &&
    typeof link === "object" &&
    typeof (link as CrossBookLink).primaryRoom === "string" &&
    Array.isArray((link as CrossBookLink).blockedRooms) &&
    (link as CrossBookLink).blockedRooms.every((room) => typeof room === "string")
  );
}

export function normalizeCrossBookLinks(links: CrossBookLink[]) {
  return links.reduce<CrossBookLink[]>((normalized, link) => {
    const primaryRoom = link.primaryRoom.trim();
    const blockedRooms = Array.from(new Set(link.blockedRooms.map((room) => room.trim())))
      .filter((room) => room && room !== primaryRoom);
    if (!primaryRoom || !blockedRooms.length) return normalized;

    const existing = normalized.find((item) => item.primaryRoom === primaryRoom);
    if (existing) {
      existing.blockedRooms = Array.from(new Set([...existing.blockedRooms, ...blockedRooms]));
    } else {
      normalized.push({ primaryRoom, blockedRooms });
    }
    return normalized;
  }, []);
}

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

export function toggleCrossBookPair(links: CrossBookLink[], firstRoom: string, secondRoom: string) {
  if (firstRoom === secondRoom) return links;

  if (roomsAreCrossBooked(links, firstRoom, secondRoom)) {
    return normalizeCrossBookLinks(links.map((link) => ({
      ...link,
      blockedRooms: link.blockedRooms.filter((room) =>
        !(
          (link.primaryRoom === firstRoom && room === secondRoom) ||
          (link.primaryRoom === secondRoom && room === firstRoom)
        )
      )
    })));
  }

  const existing = links.find((link) => link.primaryRoom === firstRoom);
  return normalizeCrossBookLinks(existing
    ? links.map((link) => link.primaryRoom === firstRoom
      ? { ...link, blockedRooms: [...link.blockedRooms, secondRoom] }
      : link)
    : [...links, { primaryRoom: firstRoom, blockedRooms: [secondRoom] }]
  );
}
