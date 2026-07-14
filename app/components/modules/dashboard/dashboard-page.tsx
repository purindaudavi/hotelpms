"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { property } from "@/app/data/pms-data";
import { DashboardAnalytics } from "./analytics/dashboard-analytics";
import { DashboardOverview } from "./overview/dashboard-overview";
import { DashboardTravelAgents } from "./travel-agents/dashboard-travel-agents";
import { DashboardProps, DashboardTab, dashboardTabs } from "./types";

export function DashboardPage({ reservations, roomList, transactions, setToast }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("Overview");
  const today = property.systemDate;
  const arrivals = reservations.filter((item) => item.checkIn === today);
  const departures = reservations.filter((item) => item.checkOut === today);
  const occupiedRooms = roomList.filter((room) => room.status === "Occupied").length;
  const occupancy = Math.round((occupiedRooms / roomList.length) * 100);
  const revenue = transactions.reduce((total, item) => total + item.value, 0);

  return (
    <main className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {dashboardTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === tab ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setToast("Dashboard refreshed")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {activeTab === "Overview" ? (
        <DashboardOverview arrivals={arrivals} departures={departures} occupiedRooms={occupiedRooms} occupancy={occupancy} roomList={roomList} revenue={revenue} />
      ) : null}

      {activeTab === "Analytics" ? <DashboardAnalytics /> : null}

      {activeTab === "Travel Agents" ? <DashboardTravelAgents /> : null}
    </main>
  );
}
