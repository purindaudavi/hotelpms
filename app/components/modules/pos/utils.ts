import type { PosCartLine, PosMenuItem, PosOrder, PosTicketStatus, PosTicketType } from "./types";

export function money(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function cartTotal(lines: PosCartLine[]) {
  return lines.reduce((sum, line) => sum + line.item.price * line.qty, 0);
}

export function itemMatchesSearch(item: PosMenuItem, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [item.name, item.code, item.category].some((value) => value.toLowerCase().includes(query));
}

export function inferTicketType(lines: PosCartLine[]): PosTicketType {
  return lines.every((line) => line.item.category === "BEVERAGES") ? "BOT" : "KOT";
}

export function nextTicketStatus(status: PosTicketStatus): PosTicketStatus {
  if (status === "toAccept") return "cooking";
  if (status === "cooking") return "toBeDelivered";
  if (status === "toBeDelivered") return "delivered";
  return "delivered";
}

export function ticketStatusLabel(status: PosTicketStatus) {
  const labels: Record<PosTicketStatus, string> = {
    toAccept: "To be Accept",
    cooking: "Cooking",
    toBeDelivered: "To be Delivered",
    delivered: "Delivered"
  };
  return labels[status];
}

export function summarizeItems(order: PosOrder) {
  return order.lines.map((line) => `${line.qty}x ${line.item.name}`).join(", ");
}
