"use client";

import { type FormEvent, useMemo, useState } from "react";
import { ChevronDown, ChevronsUpDown, Edit3, Filter, PlusCircle, RefreshCw, RotateCw, Search, Trash2, Unlink, X } from "lucide-react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import {
  type ChannelRoomRecord,
  channelRoomRatesKey,
  initialChannelRooms
} from "@/app/components/modules/channelmanager/session";
import { property } from "@/app/data/pms-data";

type ChannelStatus = "Active" | "Inactive";
type ChannelTab = "general" | "mapping" | "settings";

type ChannelRequestRecord = {
  id: string;
  title: string;
  channel: string;
  currency: string;
  status: ChannelStatus;
  propertyCode: string;
  roomMappingMode: string;
  ratePlanMapping: string;
  inventoryMode: string;
  reservationImport: boolean;
  syncMode: string;
  cutoffTime: string;
  commission: string;
  rateMarkup: string;
  paymentModel: string;
  lastSync: string;
};

type ChannelForm = Omit<ChannelRequestRecord, "id" | "lastSync">;

type ChannelManagerRequestPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

const channelOptions = ["Agoda", "Expedia", "Booking.com", "Airbnb", "MakeMyTrip", "Google Hotel / VR", "Direct Booking Engine"];
const currencyOptions = ["Auto", "LKR", "USD", "EUR", "GBP", "INR"];

const initialChannels: ChannelRequestRecord[] = [
  {
    id: "channel-agoda",
    title: "Agoda - Ronaka Airport Hotel",
    channel: "Agoda",
    currency: "Auto",
    status: "Active",
    propertyCode: "RONAKA-001",
    roomMappingMode: "Match PMS room types by name",
    ratePlanMapping: "Map base rate plans",
    inventoryMode: "Use PMS availability",
    reservationImport: true,
    syncMode: "Automatic",
    cutoffTime: "00:15",
    commission: "15",
    rateMarkup: "0",
    paymentModel: "Channel collect",
    lastSync: "2 minutes ago"
  },
  {
    id: "channel-expedia",
    title: "Expedia",
    channel: "Expedia",
    currency: "Auto",
    status: "Active",
    propertyCode: "RONAKA-001",
    roomMappingMode: "Match PMS room types by name",
    ratePlanMapping: "Map refundable and non-refundable rates",
    inventoryMode: "Use PMS availability",
    reservationImport: true,
    syncMode: "Automatic",
    cutoffTime: "00:20",
    commission: "17",
    rateMarkup: "0",
    paymentModel: "Channel collect",
    lastSync: "7 minutes ago"
  },
  {
    id: "channel-booking",
    title: "B.COM",
    channel: "Booking.com",
    currency: "Auto",
    status: "Active",
    propertyCode: "RONAKA-001",
    roomMappingMode: "Manual channel room codes",
    ratePlanMapping: "Map base rate plans",
    inventoryMode: "Use PMS availability",
    reservationImport: true,
    syncMode: "Automatic",
    cutoffTime: "00:10",
    commission: "15",
    rateMarkup: "0",
    paymentModel: "Hotel collect",
    lastSync: "1 hour ago"
  }
];

const defaultForm: ChannelForm = {
  channel: "",
  title: "",
  currency: "Auto",
  status: "Active",
  propertyCode: "RONAKA-001",
  roomMappingMode: "Match PMS room types by name",
  ratePlanMapping: "Map base rate plans",
  inventoryMode: "Use PMS availability",
  reservationImport: true,
  syncMode: "Automatic",
  cutoffTime: "00:15",
  commission: "15",
  rateMarkup: "0",
  paymentModel: "Channel collect"
};

export function ChannelManagerRequestPage({ propertyId, setToast }: ChannelManagerRequestPageProps) {
  const [records, setRecords] = useSessionState<ChannelRequestRecord[]>(`staypilot:${propertyId}:channel-manager:requests`, initialChannels);
  const [channelRooms] = useSessionState<ChannelRoomRecord[]>(channelRoomRatesKey(propertyId), initialChannelRooms);
  const [search, setSearch] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [channelFilter, setChannelFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | ChannelStatus>("All");
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [actionsOpenId, setActionsOpenId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<ChannelForm>(defaultForm);

  const visibleRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !needle || [record.title, record.channel, record.status, record.currency].join(" ").toLowerCase().includes(needle);
      const matchesChannel = channelFilter === "All" || record.channel === channelFilter;
      const matchesStatus = statusFilter === "All" || record.status === statusFilter;
      const matchesCurrency = currencyFilter === "All" || record.currency === currencyFilter;
      return matchesSearch && matchesChannel && matchesStatus && matchesCurrency;
    });
  }, [records, search, channelFilter, statusFilter, currencyFilter]);

  function createChannel() {
    setEditingId("");
    setForm(defaultForm);
    setDrawerOpen(true);
  }

  function editChannel(record: ChannelRequestRecord) {
    const { id: _id, lastSync: _lastSync, ...editable } = record;
    setEditingId(record.id);
    setForm(editable);
    setActionsOpenId("");
    setDrawerOpen(true);
  }

  function saveChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.channel) {
      setToast("Select a channel");
      return;
    }
    if (!form.title.trim()) {
      setToast("Enter a title");
      return;
    }

    const record: ChannelRequestRecord = {
      ...form,
      id: editingId || `channel-${Date.now()}`,
      title: form.title.trim(),
      lastSync: editingId ? records.find((item) => item.id === editingId)?.lastSync || "Pending sync" : "Pending sync"
    };

    setRecords((current) => {
      if (editingId) return current.map((item) => (item.id === editingId ? record : item));
      return [record, ...current];
    });
    setDrawerOpen(false);
    setEditingId("");
    setToast(`${record.title} saved`);
  }

  function toggleDeactivate(record: ChannelRequestRecord) {
    const nextStatus: ChannelStatus = record.status === "Active" ? "Inactive" : "Active";
    setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, status: nextStatus } : item)));
    setActionsOpenId("");
    setToast(`${record.title} ${nextStatus === "Active" ? "activated" : "deactivated"}`);
  }

  function fullSync(record: ChannelRequestRecord) {
    setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, lastSync: "Just now" } : item)));
    setActionsOpenId("");
    setToast(`${record.title} full sync started`);
  }

  function removeChannel(record: ChannelRequestRecord) {
    setRecords((current) => current.filter((item) => item.id !== record.id));
    setActionsOpenId("");
    setToast(`${record.title} removed`);
  }

  function refresh() {
    setActionsOpenId("");
    setToast("Channels refreshed");
  }

  return (
    <main className="space-y-8 p-4 lg:p-6">
      <section className="mx-auto max-w-7xl rounded-xl border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center border-b border-line">
          <label className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="focus-ring h-12 w-full border-0 bg-white pl-11 pr-4 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => setAdvancedOpen((value) => !value)}
            className="inline-flex h-12 items-center gap-2 border-l border-line px-5 text-sm font-semibold hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            Advanced Search
          </button>
          <button type="button" onClick={refresh} className="inline-flex h-12 items-center gap-2 border-l border-line px-5 text-sm font-semibold hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button type="button" onClick={createChannel} className="m-2 inline-flex h-10 items-center gap-2 rounded bg-blue-500 px-5 text-sm font-semibold text-white hover:bg-blue-600">
            <PlusCircle className="h-4 w-4" />
            Create
          </button>
        </div>

        {advancedOpen ? (
          <div className="grid gap-4 border-b border-line bg-slate-50 px-5 py-4 md:grid-cols-3">
            <Field label="Channel">
              <select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm">
                <option>All</option>
                {channelOptions.map((channel) => (
                  <option key={channel}>{channel}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | ChannelStatus)} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm">
                <option>All</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
            <Field label="Currency">
              <select value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value)} className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm">
                <option>All</option>
                {currencyOptions.map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-white text-slate-900">
                {["Title", "Channel", "Status", "Actions"].map((heading) => (
                  <th key={heading} className={`px-5 py-5 font-semibold ${heading === "Actions" ? "text-right" : ""}`}>
                    <span className={`inline-flex items-center gap-2 ${heading === "Actions" ? "justify-end" : ""}`}>
                      {heading}
                      {heading !== "Actions" ? <ChevronsUpDown className="h-4 w-4 text-slate-300" /> : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr key={record.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-5">{record.title}</td>
                  <td className="px-5 py-5">{record.channel}</td>
                  <td className="px-5 py-5">{record.status}</td>
                  <td className="relative px-5 py-5 text-right">
                    <button
                      type="button"
                      onClick={() => setActionsOpenId((value) => (value === record.id ? "" : record.id))}
                      className="inline-flex items-center gap-1 font-semibold text-blue-500 hover:text-blue-700"
                    >
                      Actions
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {actionsOpenId === record.id ? (
                      <div className="absolute right-5 top-12 z-20 w-44 overflow-hidden rounded-sm border border-line bg-white text-left shadow-xl">
                        <ActionButton onClick={() => editChannel(record)} icon={<Edit3 className="h-4 w-4" />}>
                          Edit
                        </ActionButton>
                        <ActionButton onClick={() => toggleDeactivate(record)} icon={<Unlink className="h-4 w-4" />}>
                          {record.status === "Active" ? "Deactivate" : "Activate"}
                        </ActionButton>
                        <ActionButton onClick={() => fullSync(record)} icon={<RotateCw className="h-4 w-4" />}>
                          Full Sync
                        </ActionButton>
                        <ActionButton danger onClick={() => removeChannel(record)} icon={<Trash2 className="h-4 w-4" />}>
                          Remove
                        </ActionButton>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!visibleRecords.length ? (
                <tr>
                  <td colSpan={4} className="px-5 py-20 text-center text-slate-500">
                    No channels found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 px-5 py-5 text-blue-500">
          <button type="button" className="text-slate-300">‹</button>
          <span className="rounded border border-blue-500 px-2 text-blue-600">1</span>
          <button type="button" className="text-slate-300">›</button>
        </div>
      </section>

      <PartnerLogos />

      {drawerOpen ? (
        <CreateChannelModal
          form={form}
          rooms={channelRooms}
          setForm={setForm}
          editing={Boolean(editingId)}
          onClose={() => {
            setDrawerOpen(false);
            setEditingId("");
          }}
          onSave={saveChannel}
        />
      ) : null}
    </main>
  );
}

function CreateChannelModal({
  form,
  rooms,
  setForm,
  editing,
  onClose,
  onSave
}: {
  form: ChannelForm;
  rooms: ChannelRoomRecord[];
  setForm: (form: ChannelForm) => void;
  editing: boolean;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [activeTab, setActiveTab] = useState<ChannelTab>("general");

  function update<K extends keyof ChannelForm>(key: K, value: ChannelForm[K]) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 py-8">
      <form onSubmit={onSave} className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-line bg-white shadow-2xl">
        <div className="flex items-center gap-4 border-b border-line px-6 py-5">
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
          <h3 className="text-xl font-semibold">{editing ? "Edit Channel" : "Create Channel"}</h3>
        </div>

        <div className="flex gap-9 border-b border-line px-6 pt-4">
          <ModalTab active={activeTab === "general"} onClick={() => setActiveTab("general")}>
            General Settings
          </ModalTab>
          <ModalTab active={activeTab === "mapping"} onClick={() => setActiveTab("mapping")}>
            Mapping
          </ModalTab>
          <ModalTab active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>
            Channel Settings
          </ModalTab>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          {activeTab === "general" ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <AlignedField label="Channel:">
                <select value={form.channel} onChange={(event) => update("channel", event.target.value)} className="focus-ring h-11 w-full rounded border border-line bg-white px-3 text-sm">
                  <option value="">Choose channel from list</option>
                  {channelOptions.map((channel) => (
                    <option key={channel}>{channel}</option>
                  ))}
                </select>
              </AlignedField>
              <AlignedField label="Title:">
                <input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Title" className="focus-ring h-11 w-full rounded border border-line px-3 text-sm" />
              </AlignedField>
              <AlignedField label="Currency:">
                <select value={form.currency} onChange={(event) => update("currency", event.target.value)} className="focus-ring h-11 w-full rounded border border-line bg-white px-3 text-sm">
                  {currencyOptions.map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              </AlignedField>
            </div>
          ) : null}

          {activeTab === "mapping" ? (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="PMS Property">
                  <input value={property.name} disabled className="h-11 w-full rounded border border-line bg-slate-50 px-3 text-sm text-slate-500" />
                </Field>
                <Field label="Channel Property Code">
                  <input value={form.propertyCode} onChange={(event) => update("propertyCode", event.target.value)} className="focus-ring h-11 w-full rounded border border-line px-3 text-sm" />
                </Field>
                <Field label="Room Mapping Mode">
                  <select value={form.roomMappingMode} onChange={(event) => update("roomMappingMode", event.target.value)} className="focus-ring h-11 w-full rounded border border-line bg-white px-3 text-sm">
                    <option>Match PMS room types by name</option>
                    <option>Manual channel room codes</option>
                    <option>One channel room to many PMS rooms</option>
                  </select>
                </Field>
                <Field label="Rate Plan Mapping">
                  <select value={form.ratePlanMapping} onChange={(event) => update("ratePlanMapping", event.target.value)} className="focus-ring h-11 w-full rounded border border-line bg-white px-3 text-sm">
                    <option>Map base rate plans</option>
                    <option>Map refundable and non-refundable rates</option>
                    <option>Use channel rate plan defaults</option>
                  </select>
                </Field>
                <Field label="Inventory Mode">
                  <select value={form.inventoryMode} onChange={(event) => update("inventoryMode", event.target.value)} className="focus-ring h-11 w-full rounded border border-line bg-white px-3 text-sm">
                    <option>Use PMS availability</option>
                    <option>Use allocated channel inventory</option>
                    <option>Stop sell until mapping approved</option>
                  </select>
                </Field>
                <label className="flex items-center gap-3 rounded border border-line px-4 py-3 text-sm font-semibold">
                  <input type="checkbox" checked={form.reservationImport} onChange={(event) => update("reservationImport", event.target.checked)} />
                  Import reservations to PMS automatically
                </label>
              </div>

              <div className="overflow-hidden rounded-lg border border-line">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-slate-50">
                      {["PMS Room Type", "Channel Room Code", "Rate Plan", "Inventory Source"].map((heading) => (
                        <th key={heading} className="px-4 py-3 font-semibold">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room, index) => (
                      <tr key={room.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-semibold">{room.title}</td>
                        <td className="px-4 py-3">{`${form.channel || "CH"}-${index + 1}`.toUpperCase().replace(/[^A-Z0-9-]/g, "")}</td>
                        <td className="px-4 py-3">{form.currency === "Auto" ? property.currency : form.currency} Standard</td>
                        <td className="px-4 py-3">{form.inventoryMode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === "settings" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Sync Mode">
                <select value={form.syncMode} onChange={(event) => update("syncMode", event.target.value)} className="focus-ring h-11 w-full rounded border border-line bg-white px-3 text-sm">
                  <option>Automatic</option>
                  <option>Manual approval</option>
                  <option>Pause outgoing sync</option>
                </select>
              </Field>
              <Field label="Daily Cut-off Time">
                <input type="time" value={form.cutoffTime} onChange={(event) => update("cutoffTime", event.target.value)} className="focus-ring h-11 w-full rounded border border-line px-3 text-sm" />
              </Field>
              <Field label="Commission %">
                <input type="number" value={form.commission} onChange={(event) => update("commission", event.target.value)} className="focus-ring h-11 w-full rounded border border-line px-3 text-sm" />
              </Field>
              <Field label="Rate Markup %">
                <input type="number" value={form.rateMarkup} onChange={(event) => update("rateMarkup", event.target.value)} className="focus-ring h-11 w-full rounded border border-line px-3 text-sm" />
              </Field>
              <Field label="Payment Model">
                <select value={form.paymentModel} onChange={(event) => update("paymentModel", event.target.value)} className="focus-ring h-11 w-full rounded border border-line bg-white px-3 text-sm">
                  <option>Channel collect</option>
                  <option>Hotel collect</option>
                  <option>Virtual card</option>
                  <option>Pay at property</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(event) => update("status", event.target.value as ChannelStatus)} className="focus-ring h-11 w-full rounded border border-line bg-white px-3 text-sm">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </Field>
            </div>
          ) : null}
        </div>

        <div className="border-t border-line p-5">
          <button type="submit" className="h-12 w-full rounded bg-blue-500 text-sm font-semibold text-white hover:bg-blue-600">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function AlignedField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid items-center gap-3 md:grid-cols-[180px_1fr]">
      <span className="text-right text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ModalTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 pb-4 text-sm font-semibold ${
        active ? "border-blue-500 text-blue-500" : "border-transparent text-slate-400 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({ children, icon, onClick, danger = false }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-sm last:border-0 hover:bg-slate-50 ${danger ? "text-rose-500" : "text-slate-700"}`}
    >
      {icon}
      {children}
    </button>
  );
}

function PartnerLogos() {
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-2 items-center gap-8 rounded-xl border border-line bg-white px-8 py-7 text-center shadow-sm md:grid-cols-6">
      <span className="text-2xl font-semibold text-rose-500">airbnb</span>
      <span className="text-2xl font-semibold text-sky-900">Expedia</span>
      <span className="text-4xl font-light tracking-wide text-slate-500">
        agoda
        <span className="mt-1 flex justify-center gap-1">
          {["bg-red-500", "bg-yellow-400", "bg-emerald-500", "bg-purple-500", "bg-sky-500"].map((color) => (
            <span key={color} className={`h-3 w-3 rounded-full ${color}`} />
          ))}
        </span>
      </span>
      <span className="text-2xl font-bold text-blue-800">Booking.com</span>
      <span className="text-xl font-bold tracking-wide text-slate-500">MAKEMYTRIP</span>
      <span className="text-4xl font-semibold tracking-tight">
        <span className="text-blue-600">G</span>
        <span className="text-red-500">o</span>
        <span className="text-yellow-500">o</span>
        <span className="text-blue-600">g</span>
        <span className="text-emerald-600">l</span>
        <span className="text-red-500">e</span>
        <span className="text-slate-500"> VR</span>
      </span>
    </section>
  );
}
