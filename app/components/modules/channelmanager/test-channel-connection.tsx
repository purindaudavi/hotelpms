"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { RefreshCw, Send } from "lucide-react";
import { api, getApiErrorMessage } from "@/app/lib/api";

type RoomMapping = { channel_room_id: string; pms_room_type_id: string; name: string; physical_room_count: number };
type RateMapping = { channel_rate_id: string; pms_rate_plan_id: string; name: string; code: string; room_type_rates: { channel_room_id: string; amount: number }[] };
type Connection = {
  mode: "test-only";
  state: "unavailable" | "offline" | "error" | "ready_to_sync" | "connected";
  message: string;
  last_sync?: string;
  room_count?: number;
  rate_count?: number;
  rooms?: RoomMapping[];
  rates?: RateMapping[];
};

const stateLabels: Record<Connection["state"], string> = {
  unavailable: "Not configured",
  offline: "Service offline",
  error: "Connection error",
  ready_to_sync: "Verified · Sync needed",
  connected: "Connected · Test only"
};

export function TestChannelConnection({ propertyId, setToast }: { propertyId: string; setToast: (message: string) => void }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<Connection>("/integrations/test-channel/connection", { params: { property_id: propertyId } });
      setConnection(response.data);
      setHidden(false);
    } catch (failure) {
      if (axios.isAxiosError(failure) && failure.response?.status === 404) setHidden(true);
      else setError(getApiErrorMessage(failure, "Could not check the test channel."));
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function sync() {
    setSyncing(true);
    setError("");
    try {
      const response = await api.post<{ room_count: number; rate_count: number; message: string }>(
        "/integrations/test-channel/sync", { property_id: propertyId }
      );
      setToast(`Test channel synced: ${response.data.room_count} room type(s), ${response.data.rate_count} rate plan(s).`);
      await refresh();
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not sync the test channel."));
    } finally {
      setSyncing(false);
    }
  }

  if (hidden || (loading && !connection)) return null;

  return <section className="mx-auto max-w-7xl rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-ink">DMS Test Channel</h2><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">LOCAL SIMULATOR</span></div>
        <p className="mt-1 text-sm text-slate-500">A real authenticated HTTP connection to the separate test provider. No Booking.com, Expedia, Agoda, or other live OTA is connected.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void refresh()} disabled={loading || syncing} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className="h-4 w-4" />Test connection</button>
        <button type="button" onClick={() => void sync()} disabled={loading || syncing || connection?.state === "unavailable"} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />{syncing ? "Syncing…" : "Sync rooms & rates"}</button>
      </div>
    </div>
    {error ? <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md bg-slate-50 p-3 text-sm">
      <span className="font-semibold">Status: {loading ? "Checking…" : connection ? stateLabels[connection.state] : "Unknown"}</span>
      {connection?.room_count !== undefined ? <span>Mapped rooms: {connection.room_count}</span> : null}
      {connection?.rate_count !== undefined ? <span>Mapped rates: {connection.rate_count}</span> : null}
      {connection?.last_sync ? <span>Last snapshot: {new Date(connection.last_sync).toLocaleString()}</span> : null}
    </div>
    {connection?.message ? <p className="mt-3 text-sm text-slate-600">{connection.message}</p> : null}
    {connection?.state === "connected" ? <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="overflow-x-auto rounded-md border border-line"><h3 className="border-b border-line px-3 py-2 text-sm font-semibold">Room mappings</h3><table className="w-full text-left text-xs"><thead><tr><th className="px-3 py-2">PMS room</th><th className="px-3 py-2">Provider code</th><th className="px-3 py-2">Physical rooms</th></tr></thead><tbody>{connection.rooms?.map((room) => <tr key={room.channel_room_id} className="border-t border-line"><td className="px-3 py-2">{room.name}</td><td className="px-3 py-2 font-mono">{room.channel_room_id}</td><td className="px-3 py-2">{room.physical_room_count}</td></tr>)}</tbody></table></div>
      <div className="overflow-x-auto rounded-md border border-line"><h3 className="border-b border-line px-3 py-2 text-sm font-semibold">Rate mappings</h3><table className="w-full text-left text-xs"><thead><tr><th className="px-3 py-2">PMS rate</th><th className="px-3 py-2">Provider code</th><th className="px-3 py-2">Room prices</th></tr></thead><tbody>{connection.rates?.map((rate) => <tr key={rate.channel_rate_id} className="border-t border-line"><td className="px-3 py-2">{rate.name}</td><td className="px-3 py-2 font-mono">{rate.channel_rate_id}</td><td className="px-3 py-2">{rate.room_type_rates.length}</td></tr>)}</tbody></table></div>
    </div> : null}
    <p className="mt-4 text-xs text-slate-500">After syncing, create a synthetic booking from the separate provider terminal. The PMS will import it; this snapshot does not send date-specific availability.</p>
  </section>;
}
