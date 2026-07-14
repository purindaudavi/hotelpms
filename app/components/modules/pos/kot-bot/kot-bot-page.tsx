"use client";

import { type ReactNode, useMemo, useState } from "react";
import { Grid3X3, List, Mic, Utensils } from "lucide-react";
import type { PosOrder, PosTicketStatus, PosTicketType } from "../types";
import { money, nextTicketStatus, summarizeItems, ticketStatusLabel } from "../utils";
import { IconButton, PosButton, PosFrame, PosPanel } from "../components/pos-ui";

type KotBotPageProps = {
  orders: PosOrder[];
  advanceOrder: (orderId: string) => void;
  setToast: (message: string) => void;
};

type MonitorFilter = PosTicketType | "ALL";

const columns: Array<{ status: PosTicketStatus; title: string; className: string }> = [
  { status: "toAccept", title: "To be Accept", className: "bg-amber-100 text-amber-900" },
  { status: "cooking", title: "Cooking", className: "bg-yellow-100 text-yellow-900" },
  { status: "toBeDelivered", title: "To be Delivered", className: "bg-emerald-100 text-emerald-800" }
];

export function KotBotPage({ orders, advanceOrder, setToast }: KotBotPageProps) {
  const [filter, setFilter] = useState<MonitorFilter>("KOT");
  const [compact, setCompact] = useState(false);

  const visibleOrders = useMemo(
    () => orders.filter((order) => order.status !== "delivered" && (filter === "ALL" || order.type === filter)),
    [filter, orders]
  );

  function columnOrders(status: PosTicketStatus) {
    return visibleOrders.filter((order) => order.status === status);
  }

  return (
    <PosFrame>
      <PosPanel className="mx-auto max-w-[1640px]" bodyClassName="flex items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          <MonitorTab active={filter === "KOT"} icon={<Utensils className="h-5 w-5" />} onClick={() => setFilter("KOT")}>KOT</MonitorTab>
          <MonitorTab active={filter === "BOT"} icon={<Mic className="h-5 w-5" />} onClick={() => setFilter("BOT")}>BOT</MonitorTab>
          <MonitorTab active={filter === "ALL"} icon={<Grid3X3 className="h-5 w-5" />} onClick={() => setFilter("ALL")}>ALL</MonitorTab>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
            <span className="h-2 w-2 rounded-full bg-white" />
            LIVE
          </span>
          <IconButton label="Compact view" active={compact} onClick={() => setCompact((value) => !value)}>
            <List className="h-5 w-5" />
          </IconButton>
        </div>
      </PosPanel>

      {!visibleOrders.length ? (
        <div className="grid min-h-32 place-items-center text-lg text-slate-500">No orders found for this filter.</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        {columns.map((column) => {
          const items = columnOrders(column.status);
          return (
            <section key={column.status} className="min-h-72 rounded-2xl bg-slate-100 p-5">
              <div className={`mb-5 flex h-12 items-center justify-between rounded-full px-4 text-sm font-bold ${column.className}`}>
                <span>{column.title}</span>
                <span className="grid h-7 min-w-7 place-items-center rounded-full bg-white px-2 text-slate-700">{items.length}</span>
              </div>
              <div className={compact ? "space-y-2" : "space-y-4"}>
                {items.map((order) => (
                  <OrderTicket key={order.id} order={order} compact={compact} onAdvance={() => {
                    const nextStatus = nextTicketStatus(order.status);
                    advanceOrder(order.id);
                    setToast(`${order.ticketNo} moved to ${ticketStatusLabel(nextStatus)}`);
                  }} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </PosFrame>
  );
}

function MonitorTab({ active, icon, children, onClick }: { active: boolean; icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-12 items-center gap-3 rounded-lg border px-6 text-sm font-bold shadow-sm ${
        active ? "border-blue-500 bg-blue-500 text-white" : "border-line bg-white text-slate-700"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function OrderTicket({ order, compact, onAdvance }: { order: PosOrder; compact: boolean; onAdvance: () => void }) {
  const action = order.status === "toAccept" ? "Accept" : order.status === "cooking" ? "Ready" : "Deliver";

  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{order.ticketNo}</p>
          <p className="text-xs font-semibold text-slate-500">{order.type} - {order.createdTime}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{order.orderNo}</span>
      </div>
      {!compact ? (
        <>
          <p className="mt-3 text-sm font-semibold">{order.outletName}</p>
          <p className="mt-2 text-sm text-slate-600">{summarizeItems(order)}</p>
          <p className="mt-3 text-sm font-semibold">Total {money(order.total)}</p>
        </>
      ) : (
        <p className="mt-2 truncate text-sm text-slate-600">{summarizeItems(order)}</p>
      )}
      <PosButton className="mt-4 w-full" tone="dark" onClick={onAdvance}>
        {action}
      </PosButton>
    </article>
  );
}
