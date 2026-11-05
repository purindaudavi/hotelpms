import type { PropertyRole } from "./property-workspaces";

const frontDeskPages = new Set(["dashboard", "front-desk", "reservation/bookings", "reservation/arrivals", "reservation/departures", "reservation/in-house", "reservation/guest-profile", "reservation/travel-agents", "rooms-rates/rooms", "rooms-rates/rates", "rooms-rates/inventory", "housekeeping/board", "housekeeping/information", "financials/invoices"]);
export function canOpenPropertyPage(role: PropertyRole | "demo" | null, permissions: string[], path: string) {
  if (path === "night-audit") return ["owner", "administrator", "finance"].includes(role || "") || (role === "front_desk" && permissions.includes("night-audit.run"));
  if (role === "demo" || permissions.includes("operations.manage")) return true;
  if (role === "housekeeping") return ["dashboard", "housekeeping/board"].includes(path);
  if (role === "finance") { const parts = path.split("/"); const section = parts.slice(0, 2).join("/"); return ["dashboard", "reports", "night-audit", "reservation/bookings"].includes(path) || (parts.length === 3 && section === "reservation/bookings") || (parts.length <= 3 && ["financials/transactions", "financials/invoices", "financials/credit-notes", "financials/refunds", "financials/withdrawals", "financials/purchases", "financials/expenses", "financials/payables", "financials/receivables", "financials/profit-loss"].includes(section)); }
  const parts = path.split("/").filter(Boolean);
  const recordPage = parts.length === 3 && ["reservation/bookings", "financials/invoices"].includes(parts.slice(0, 2).join("/"));
  return role === "front_desk" && (frontDeskPages.has(path) || recordPage);
}
