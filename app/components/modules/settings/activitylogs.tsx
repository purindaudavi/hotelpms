"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

type ActivityLog = { id: string; date: string; user: string; activity: string; platform: string };
const logs: ActivityLog[] = [
  { id: "1", date: "2026-06-15T19:31:59", user: "CHANNEL MANAGER", activity: "Room No: 04 added", platform: "API" },
  { id: "2", date: "2026-06-15T19:31:59", user: "CHANNEL MANAGER", activity: "Reservation created via channel manager", platform: "API" },
  { id: "3", date: "2026-06-15T15:37:40", user: "CHANNEL MANAGER", activity: "Room No: 07 added", platform: "API" },
  { id: "4", date: "2026-06-14T11:26:00", user: "ASIRI PERERA", activity: "Reservation updated", platform: "WEB" },
  { id: "5", date: "2026-06-14T09:15:00", user: "HOUSEKEEPING", activity: "Room No: 05 marked clean", platform: "WEB" },
  { id: "6", date: "2026-06-13T08:37:13", user: "CHANNEL MANAGER", activity: "Reservation created via channel manager", platform: "API" },
  { id: "7", date: "2026-06-12T13:10:13", user: "FRONT DESK", activity: "Guest checked in", platform: "WEB" }
];

export function ActivityLogsPage() {
  const [user, setUser] = useState("");
  const [activity, setActivity] = useState("");
  const [platform, setPlatform] = useState("");
  const [date, setDate] = useState("");
  const filtered = useMemo(() => logs.filter((log) => {
    return log.user.toLowerCase().includes(user.toLowerCase())
      && log.activity.toLowerCase().includes(activity.toLowerCase())
      && log.platform.toLowerCase().includes(platform.toLowerCase())
      && (!date || log.date.slice(0, 10) === date);
  }), [activity, date, platform, user]);

  function exportCsv() {
    const rows = [["Date", "User", "Activity", "Platform"], ...filtered.map((log) => [log.date, log.user, log.activity, log.platform])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "activity-logs.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <main className="p-4 lg:p-6"><section className="rounded-lg border border-line bg-white p-6 shadow-sm">
    <div className="flex justify-between"><h1 className="text-3xl font-bold">Activity Logs</h1><button className="h-11 rounded-md bg-ink px-5 font-semibold text-white">Night Audit Process</button></div>
    <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">{[["Username", "Search by user", user, setUser], ["Activity", "Search by activity", activity, setActivity], ["Platform", "Search by platform", platform, setPlatform]].map(([label, placeholder, value, setter]) => <label key={label as string}><span className="mb-2 block text-sm font-semibold">{label as string}</span><input value={value as string} onChange={(e) => (setter as (value: string) => void)(e.target.value)} placeholder={placeholder as string} className="focus-ring h-11 w-full rounded-md border border-line px-3" /></label>)}<label><span className="mb-2 block text-sm font-semibold">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="focus-ring h-11 w-full rounded-md border border-line px-3" /></label><button onClick={exportCsv} className="mt-auto inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 font-semibold text-white"><Download className="h-4 w-4" />Export CSV</button></div>
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-line text-slate-500">{["Date", "User", "Activity", "Platform"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{filtered.map((log) => <tr key={log.id} className="border-b border-line"><td className="px-4 py-4">{new Date(log.date).toLocaleString()}</td><td className="px-4 py-4">{log.user}</td><td className="px-4 py-4">{log.activity}</td><td className="px-4 py-4">{log.platform}</td></tr>)}</tbody></table>{!filtered.length ? <p className="py-12 text-center text-slate-500">No activity logs match these filters.</p> : null}</div>
  </section></main>;
}
