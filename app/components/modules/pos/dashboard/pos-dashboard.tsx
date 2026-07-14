"use client";

import { type ReactNode, useMemo } from "react";
import { BarChart3, DollarSign, RefreshCw, ShoppingCart, TrendingUp } from "lucide-react";
import type { PosOrder, PosOutlet } from "../types";
import { money, summarizeItems } from "../utils";
import { PosButton, PosFrame, PosPanel } from "../components/pos-ui";
import { posSystemDate } from "../constants";

type PosDashboardProps = {
  orders: PosOrder[];
  outlets: PosOutlet[];
  setToast: (message: string) => void;
};

export function PosDashboard({ orders, outlets, setToast }: PosDashboardProps) {
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    const avgOrder = totalOrders ? revenue / totalOrders : 0;
    const activeOutlets = new Set(orders.map((order) => order.outletId)).size;
    return { totalOrders, revenue, avgOrder, activeOutlets };
  }, [orders]);

  const topItems = useMemo(() => {
    const countMap = new Map<string, { name: string; qty: number; revenue: number }>();
    orders.forEach((order) => {
      order.lines.forEach((line) => {
        const current = countMap.get(line.item.id) ?? { name: line.item.name, qty: 0, revenue: 0 };
        current.qty += line.qty;
        current.revenue += line.item.price * line.qty;
        countMap.set(line.item.id, current);
      });
    });
    return Array.from(countMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  return (
    <PosFrame>
      <div className="flex items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-normal">POS Analytics</h1>
          <p className="mt-2 text-lg text-slate-500">Today&apos;s outlet performance and top-selling items</p>
          <p className="mt-1 text-sm text-slate-400">{posSystemDate}</p>
        </div>
        <PosButton icon={<RefreshCw className="h-4 w-4" />} onClick={() => setToast("POS analytics refreshed")}>
          Refresh
        </PosButton>
      </div>

      <div className="grid gap-5 xl:grid-cols-4">
        <MetricCard title="Total Orders" value={metrics.totalOrders} detail={`${metrics.activeOutlets} outlets today`} icon={<ShoppingCart className="h-5 w-5" />} tone="slate" />
        <MetricCard title="Revenue" value={money(metrics.revenue)} detail="Today" icon={<DollarSign className="h-5 w-5" />} tone="emerald" />
        <MetricCard title="Avg. Order Value" value={money(metrics.avgOrder)} detail="Per transaction" icon={<TrendingUp className="h-5 w-5" />} tone="amber" />
        <MetricCard title="Outlets" value={metrics.activeOutlets} detail="Active today" icon={<BarChart3 className="h-5 w-5" />} tone="violet" />
      </div>

      <PosPanel bodyClassName="p-0">
        {orders.length ? (
          <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
            <div className="p-6">
              <h2 className="text-xl font-semibold">Outlet Sales</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {["Order", "Outlet", "Items", "Status", "Total"].map((heading) => (
                        <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-line">
                        <td className="px-4 py-4 font-semibold">{order.orderNo}</td>
                        <td className="px-4 py-4">{order.outletName}</td>
                        <td className="px-4 py-4">{summarizeItems(order)}</td>
                        <td className="px-4 py-4">{order.settled ? "Settled" : "Open"}</td>
                        <td className="px-4 py-4 font-semibold">{money(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <aside className="border-t border-line p-6 xl:border-l xl:border-t-0">
              <h2 className="text-xl font-semibold">Top-selling items</h2>
              <div className="mt-5 space-y-3">
                {topItems.map((item) => (
                  <div key={item.name} className="rounded-lg border border-line p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{item.name}</p>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{item.qty}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Revenue {money(item.revenue)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                Active configured outlets: {outlets.filter((outlet) => outlet.active).length}
              </div>
            </aside>
          </div>
        ) : (
          <div className="grid min-h-44 place-items-center text-center text-slate-500">
            No sales recorded for today.
          </div>
        )}
      </PosPanel>
    </PosFrame>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon,
  tone
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  tone: "slate" | "emerald" | "amber" | "violet";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700"
  };

  return (
    <section className="rounded-lg border border-line bg-white p-7 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-medium text-slate-500">{title}</p>
          <p className="mt-6 text-3xl font-semibold">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone]}`}>{icon}</div>
      </div>
    </section>
  );
}
