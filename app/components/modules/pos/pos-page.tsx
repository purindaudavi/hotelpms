"use client";

import { useCallback } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { posSystemDate, initialCategories, initialMenuItems, initialOutlets } from "./constants";
import { PosDashboard } from "./dashboard/pos-dashboard";
import { KotBotPage } from "./kot-bot/kot-bot-page";
import { PosOrderPage } from "./order/pos-order-page";
import type { PosCartLine, PosCategory, PosMenuItem, PosModuleProps, PosOrder, PosOutlet } from "./types";
import { cartTotal, inferTicketType, nextTicketStatus } from "./utils";

export function PosPage(props: PosModuleProps) {
  const { activePath, propertyId, setToast, setTransactions } = props;
  const keyPrefix = `staypilot:${propertyId}:pos`;
  const [outlets, setOutlets] = useSessionState<PosOutlet[]>(`${keyPrefix}:outlets`, initialOutlets);
  const [selectedOutletId, setSelectedOutletId] = useSessionState<string | null>(`${keyPrefix}:selected-outlet`, null);
  const [categories, setCategories] = useSessionState<PosCategory[]>(`${keyPrefix}:categories`, initialCategories);
  const [menuItems, setMenuItems] = useSessionState<PosMenuItem[]>(`${keyPrefix}:menu-items`, initialMenuItems);
  const [cart, setCart] = useSessionState<PosCartLine[]>(`${keyPrefix}:cart`, []);
  const [orders, setOrders] = useSessionState<PosOrder[]>(`${keyPrefix}:orders`, []);

  const createOrder = useCallback(
    (outlet: PosOutlet, lines: PosCartLine[], settled: boolean) => {
      const now = new Date();
      const index = orders.length + 1;
      const total = cartTotal(lines);
      const type = inferTicketType(lines);
      const order: PosOrder = {
        id: `pos-order-${Date.now()}`,
        orderNo: `ORD-${String(index).padStart(4, "0")}`,
        ticketNo: `${type}-${String(1000 + index)}`,
        type,
        status: "toAccept",
        outletId: outlet.id,
        outletName: outlet.name,
        lines,
        subtotal: total,
        total,
        settled,
        createdDate: posSystemDate,
        createdTime: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      };

      setOrders((current) => [order, ...current]);

      if (settled) {
        setTransactions((current) => [
          {
            id: `pos-tran-${Date.now()}`,
            date: posSystemDate,
            type: "POS Sale",
            documentNo: order.orderNo,
            value: total,
            reservationNo: "-",
            roomNo: "-",
            createdBy: outlet.name,
            status: "Active"
          },
          ...current
        ]);
      }

      setToast(`${order.ticketNo} created`);
    },
    [orders.length, setToast, setTransactions]
  );

  function advanceOrder(orderId: string) {
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status: nextTicketStatus(order.status) } : order)));
  }

  if (activePath.endsWith("order")) {
    return (
      <PosOrderPage
        outlets={outlets}
        setOutlets={setOutlets}
        selectedOutletId={selectedOutletId}
        setSelectedOutletId={setSelectedOutletId}
        categories={categories}
        setCategories={setCategories}
        menuItems={menuItems}
        setMenuItems={setMenuItems}
        cart={cart}
        setCart={setCart}
        orders={orders}
        createOrder={createOrder}
        setToast={setToast}
      />
    );
  }

  if (activePath.endsWith("kot-bot-monitor")) {
    return <KotBotPage orders={orders} advanceOrder={advanceOrder} setToast={setToast} />;
  }

  return <PosDashboard orders={orders} outlets={outlets} setToast={setToast} />;
}
