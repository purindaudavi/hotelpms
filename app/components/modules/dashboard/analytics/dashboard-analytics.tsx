"use client";

import { useState } from "react";
import { AnalyticsCard } from "../components/dashboard-panel";
import { PerformanceMetricsChart, PieMetricChart, ProfitLossAnalyticsCard } from "./analytics-charts";

export function DashboardAnalytics() {
  const [period, setPeriod] = useState("Monthly");

  return (
    <>
      <div className="flex justify-end">
        <select value={period} onChange={(event) => setPeriod(event.target.value)} className="focus-ring h-11 w-56 rounded-md border border-line bg-white px-4 text-sm">
          <option>Monthly</option>
          <option>Quarterly</option>
          <option>Yearly</option>
        </select>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ProfitLossAnalyticsCard />
        <AnalyticsCard title="Revenue Breakdown" subtitle="Revenue by department">
          <PieMetricChart
            slices={[
              { label: "Rooms", value: 65, color: "#10b981" },
              { label: "F&B", value: 20, color: "#6366f1" },
              { label: "Spa", value: 10, color: "#f43f5e" },
              { label: "Other", value: 5, color: "#f59e0b" }
            ]}
          />
        </AnalyticsCard>
        <AnalyticsCard title="Guest Demographics" subtitle="Guest profile analysis">
          <PieMetricChart
            slices={[
              { label: "Business", value: 40, color: "#10b981" },
              { label: "Leisure", value: 35, color: "#6366f1" },
              { label: "Groups", value: 15, color: "#f43f5e" },
              { label: "Other", value: 10, color: "#f59e0b" }
            ]}
          />
        </AnalyticsCard>
        <AnalyticsCard title="Performance Metrics" subtitle="Key performance indicators">
          <PerformanceMetricsChart />
        </AnalyticsCard>
      </div>
    </>
  );
}
