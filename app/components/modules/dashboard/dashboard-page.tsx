"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { property } from "@/app/data/pms-data";
import { getDashboardApiErrorMessage, getDashboardSummary, type DashboardSummary } from "@/app/lib/dashboard-api";
import { DashboardAnalytics } from "./analytics/live-dashboard-analytics";
import { createDemoDashboardSummary } from "./demo-data";
import { DashboardOverview } from "./overview/dashboard-overview";
import { DashboardTravelAgents } from "./travel-agents/live-dashboard-travel-agents";
import { DashboardProps, DashboardTab, dashboardTabs } from "./types";

export function DashboardPage({ propertyId, setToast }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("Overview");
  const [demoMode, setDemoMode] = useState(false);
  const [liveData, setLiveData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const demoData = useMemo(() => createDemoDashboardSummary(property.systemDate), []);

  const loadLiveData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const summary = await getDashboardSummary(propertyId, property.systemDate, property.currency);
      setLiveData(summary);
      setToast("Dashboard loaded from MongoDB");
    } catch (requestError) {
      const message = getDashboardApiErrorMessage(requestError);
      setError(message);
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [propertyId, setToast]);

  useEffect(() => { void loadLiveData(); }, [loadLiveData]);

  const data = demoMode ? demoData : liveData;

  return (
    <main className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {dashboardTabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === tab ? "bg-white shadow-sm" : "text-slate-500"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className={`inline-flex h-10 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm font-semibold ${demoMode ? "border-amber-300 bg-amber-50 text-amber-800" : "border-line bg-white text-slate-700"}`}>
            <input type="checkbox" checked={demoMode} onChange={(event) => setDemoMode(event.target.checked)} className="h-4 w-4 accent-amber-500" />
            Demo data
          </label>
          <button type="button" disabled={loading && !demoMode} onClick={() => demoMode ? setToast("Demo dashboard regenerated") : void loadLiveData()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading && !demoMode ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {demoMode ? <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Demo data is ON. These figures are examples and are not from MongoDB.</div> : null}
      {!demoMode && loading && !data ? <DashboardState message="Loading dashboard from MongoDB..." /> : null}
      {!demoMode && error && !data ? <DashboardState message={error} action={<button type="button" onClick={() => void loadLiveData()} className="mt-3 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">Try again</button>} /> : null}

      {data ? <>
        <p className="text-xs text-slate-500">{demoMode ? "Source: Demo data" : `Source: MongoDB · Updated ${new Date(data.generated_at).toLocaleString()}`}</p>
        {activeTab === "Overview" ? <DashboardOverview data={data} /> : null}
        {activeTab === "Analytics" ? <DashboardAnalytics data={data.analytics} currency={data.currency} /> : null}
        {activeTab === "Travel Agents" ? <DashboardTravelAgents data={data.travel_agents} period={data.period} /> : null}
      </> : null}
    </main>
  );
}

function DashboardState({ message, action }: { message: string; action?: React.ReactNode }) {
  return <section className="grid min-h-64 place-items-center rounded-lg border border-line bg-white p-8 text-center text-slate-600"><div><p>{message}</p>{action}</div></section>;
}
