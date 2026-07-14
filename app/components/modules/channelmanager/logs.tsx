"use client";

import { AlertCircle, ClipboardList, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { type ChannelLogEntry, channelLogsKey } from "@/app/components/modules/channelmanager/session";

type ChannelManagerLogsPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

const statusClass: Record<ChannelLogEntry["status"], string> = {
  Success: "bg-emerald-50 text-emerald-700",
  Warning: "bg-amber-50 text-amber-700",
  Error: "bg-rose-50 text-rose-700",
  Info: "bg-blue-50 text-blue-700"
};

export function ChannelManagerLogsPage({ propertyId, setToast }: ChannelManagerLogsPageProps) {
  const [logs, setLogs] = useSessionState<ChannelLogEntry[]>(channelLogsKey(propertyId), []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const visibleLogs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch = !needle || [log.time, log.channel, log.event, log.status, log.direction, log.message].join(" ").toLowerCase().includes(needle);
      const matchesStatus = status === "All" || log.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [logs, search, status]);

  function refreshLogs() {
    setToast(logs.length ? "Channel logs refreshed" : "No channel logs returned");
  }

  function clearLogs() {
    setLogs([]);
    setToast("Channel logs cleared for this session");
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-4 py-4">
      {logs.length === 0 ? (
        <section className="grid min-h-[calc(100vh-130px)] place-items-center text-center text-slate-400">
          <div>
            <div className="relative mx-auto mb-5 grid h-44 w-44 place-items-center rounded-full bg-slate-50">
              <ClipboardList className="h-24 w-24 text-slate-300" />
              <AlertCircle className="absolute bottom-8 right-8 h-9 w-9 text-slate-400" />
            </div>
            <p className="text-base">Query error</p>
            <p className="mt-3 max-w-md text-sm text-slate-400">
              Logs will appear here after full sync, pull reservations, webhook receipt, inventory push, or channel message events.
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-md border border-line bg-white">
          <div className="flex flex-wrap items-center border-b border-line">
            <label className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search logs" className="focus-ring h-12 w-full border-0 bg-white pl-11 pr-4 text-sm" />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="focus-ring h-12 border-x border-line bg-white px-4 text-sm">
              <option>All</option>
              <option>Success</option>
              <option>Warning</option>
              <option>Error</option>
              <option>Info</option>
            </select>
            <button type="button" onClick={refreshLogs} className="flex h-12 items-center gap-2 border-r border-line px-4 text-sm font-semibold hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button type="button" onClick={clearLogs} className="h-12 px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50">
              Clear
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {["Time", "Channel", "Direction", "Event", "Status", "Message", "Payload"].map((header) => (
                    <th key={header} className="px-5 py-4 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{log.time}</td>
                    <td className="px-5 py-4">{log.channel}</td>
                    <td className="px-5 py-4">{log.direction}</td>
                    <td className="px-5 py-4 font-semibold">{log.event}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[log.status]}`}>{log.status}</span>
                    </td>
                    <td className="min-w-[260px] px-5 py-4 text-slate-600">{log.message}</td>
                    <td className="min-w-[260px] px-5 py-4">
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{log.payload}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
