"use client";

import { Dispatch, FormEvent, Fragment, SetStateAction, useState } from "react";
import {
  ArrowLeft,
  Baby,
  BarChart3,
  BedDouble,
  Check,
  CreditCard,
  Database,
  Download,
  Edit3,
  Eye,
  Filter,
  Link2,
  Mail,
  Minus,
  Package,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  ShoppingCart,
  Star,
  Trash2,
  Utensils,
  X,
  Zap
} from "lucide-react";
import {
  channels,
  currency,
  dateLabel,
  FinancialTransaction,
  property,
  Reservation,
  ReservationStatus,
  roomTypes,
  Room,
  rooms as seedRooms
} from "@/app/data/pms-data";
import { appendActivity, upsertRecord } from "@/app/lib/supabase-data";
import { DashboardPage as DashboardModulePage } from "@/app/components/modules/dashboard/dashboard-page";
import { FrontDeskPage } from "@/app/components/modules/front-desk/front-desk-page";
import { PosPage as PosModulePage } from "@/app/components/modules/pos/pos-page";
import { ReservationPage as ReservationModulePage } from "@/app/components/modules/reservation/reservation-page";
import { RoomsRatesPage as RoomsRatesModulePage } from "@/app/components/modules/rooms-rates/rooms-rates-page";
import { HousekeepingPage as HousekeepingModulePage } from "@/app/components/modules/housekeeping/housekeeping-page";
import { FinancialsPage as FinancialsModulePage } from "@/app/components/modules/financials/financials-page";
import { ReportsPage as ReportsModulePage } from "@/app/components/modules/reports/reports-page";
import { TemplatesPage as CrmTemplatesModulePage } from "@/app/components/modules/crm/templates";
import { CampaignsPage as CrmCampaignsModulePage } from "@/app/components/modules/crm/campaigns";
import { ChannelManagerRequestPage } from "@/app/components/modules/channelmanager/channelmanager";
import { ChannelManagerDashboardPage } from "@/app/components/modules/channelmanager/dashboard";
import { ChannelManagerInventoryPage } from "@/app/components/modules/channelmanager/inventory";
import { ChannelManagerChannelsPage } from "@/app/components/modules/channelmanager/channels";
import { ChannelManagerRoomRatesPage } from "@/app/components/modules/channelmanager/roomandrates";
import { ChannelManagerBookingsPage } from "@/app/components/modules/channelmanager/bookings";
import { ChannelManagerLogsPage } from "@/app/components/modules/channelmanager/logs";
import { ChannelManagerMessagePage } from "@/app/components/modules/channelmanager/message";
import { ChannelManagerFullSyncPage } from "@/app/components/modules/channelmanager/fullsync";
import { ChannelManagerPullFutureReservationsPage } from "@/app/components/modules/channelmanager/pullfuturereservations";
import { NightAuditPage as NightAuditModulePage } from "@/app/components/modules/nightaudit/nightaudit";
import { IbePage as IbeModulePage } from "@/app/components/modules/ibe/ibe-page";
import { UsersSettingsPage } from "@/app/components/modules/settings/users";
import { PropertySettingsPage } from "@/app/components/modules/settings/property/property-page";
import { SettingsTemplatesPage } from "@/app/components/modules/settings/templates";
import { DataImportPage } from "@/app/components/modules/settings/dataimport";
import { ActivityLogsPage } from "@/app/components/modules/settings/activitylogs";
import { EmployeePage } from "@/app/components/modules/settings/employee";

type ModuleProps = {
  activePath: string;
  propertyId: string;
  reservations: Reservation[];
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
  roomList: Room[];
  setRoomList: Dispatch<SetStateAction<Room[]>>;
  transactions: FinancialTransaction[];
  setTransactions: Dispatch<SetStateAction<FinancialTransaction[]>>;
  setToast: (message: string) => void;
};

const statusClass: Record<ReservationStatus, string> = {
  Confirmed: "bg-cyan-100 text-cyan-700",
  Tentative: "bg-amber-100 text-amber-700",
  "Checked-in": "bg-emerald-100 text-emerald-700",
  "Checked-out": "bg-pink-100 text-pink-700",
  Cancelled: "bg-slate-200 text-slate-600",
  "No Show": "bg-stone-200 text-stone-700",
  Blocked: "bg-fuchsia-100 text-fuchsia-700"
};

const housekeepingClass: Record<Room["housekeeping"], string> = {
  Clean: "border-emerald-500 bg-emerald-50 text-emerald-700",
  Dirty: "border-rose-500 bg-rose-50 text-rose-700",
  Occupied: "border-amber-500 bg-amber-50 text-amber-700",
  WIP: "border-indigo-500 bg-indigo-50 text-indigo-700"
};

export function ModuleContent(props: ModuleProps) {
  const path = props.activePath;

  if (path === "dashboard") return <DashboardModulePage {...props} />;
  if (path === "front-desk") return <FrontDeskPage {...props} />;
  if (path.startsWith("reservation")) return <ReservationModulePage {...props} />;
  if (path.startsWith("rooms-rates")) return <RoomsRatesModulePage {...props} />;
  if (path.startsWith("pos")) return <PosModulePage {...props} />;
  if (path.startsWith("housekeeping")) return <HousekeepingModulePage {...props} />;
  if (path.startsWith("financials")) return <FinancialsModulePage {...props} />;
  if (path === "reports") return <ReportsModulePage {...props} />;
  if (path.startsWith("crm")) return <CrmModule {...props} />;
  if (path.startsWith("channel-manager")) return <ChannelManagerModule {...props} />;
  if (path === "night-audit") return <NightAuditModulePage {...props} />;
  if (path === "ibe") return <IbeModulePage {...props} />;
  if (path.startsWith("settings")) return <SettingsModule {...props} />;

  return <DashboardModulePage {...props} />;
}

function Page({ children }: { children: React.ReactNode }) {
  return <main className="space-y-4 p-4 lg:p-6">{children}</main>;
}

function Panel({
  title,
  subtitle,
  children,
  action,
  className = ""
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ToolbarButton({
  children,
  onClick,
  variant = "secondary",
  type = "button",
  disabled = false
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const classes = {
    primary: "bg-ink text-white hover:bg-slate-800",
    secondary: "border border-line bg-white text-slate-800 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:opacity-60 ${classes[variant]}`}
    >
      {children}
    </button>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder = "Search..."
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="relative block min-w-[240px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="focus-ring h-11 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm"
      />
    </label>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge className={statusClass[status]}>{status}</Badge>;
}

function MetricCard({
  title,
  value,
  detail,
  tone,
  icon
}: {
  title: string;
  value: number | string;
  detail: string;
  tone: "emerald" | "orange" | "blue" | "violet";
  icon: React.ReactElement;
}) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700"
  };

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${tones[tone]}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/80">{icon}</div>
        <span className="text-4xl font-semibold">{value}</span>
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-75">{detail}</p>
    </div>
  );
}

function ReservationModule(props: ModuleProps) {
  const path = props.activePath;
  if (path.endsWith("create-event")) return <BookingFormPage {...props} mode="event" />;
  if (path.endsWith("cross-booking")) return <BookingFormPage {...props} mode="cross" />;
  if (path.endsWith("arrivals")) return <FilteredBookingTable {...props} kind="arrivals" />;
  if (path.endsWith("departures")) return <FilteredBookingTable {...props} kind="departures" />;
  if (path.endsWith("in-house")) return <FilteredBookingTable {...props} kind="in-house" />;
  if (path.endsWith("travel-agents")) return <TravelAgentsPage {...props} />;
  if (path.endsWith("guest-profile")) return <GuestProfilesPage {...props} />;
  return <ReservationsPage {...props} />;
}

function ReservationsPage({ propertyId, reservations, setReservations, setToast }: ModuleProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(true);
  const [source, setSource] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = reservations.filter((booking) => {
    const text = `${booking.guest} ${booking.resNo} ${booking.bookingRef} ${booking.email} ${booking.phone}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesSource = source === "All" || booking.source === source;
    const visible = showAll || booking.status !== "Cancelled";
    return matchesSearch && matchesSource && visible;
  });

  const sources = ["All", ...Array.from(new Set(reservations.map((booking) => booking.source)))];

  function exportCsv() {
    const header = ["Reservation", "Guest", "Check In", "Check Out", "Source", "Status", "Total"];
    const rows = filtered.map((booking) => [booking.resNo, booking.guest, booking.checkIn, booking.checkOut, booking.source, booking.status, booking.total]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "staypilot-reservations.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("CSV exported");
  }

  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <button className="rounded-md bg-white px-4 py-2 text-sm font-semibold shadow-sm">Reservations</button>
          <button className="rounded-md px-4 py-2 text-sm font-semibold text-slate-500">Business Blocks</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton variant="primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Reservation
          </ToolbarButton>
          <ToolbarButton onClick={() => setToast("Reservation link shared")}>
            <Share2 className="h-4 w-4" />
            Share
          </ToolbarButton>
          <ToolbarButton onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </ToolbarButton>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
        <SearchBox value={search} onChange={setSearch} />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Date Filter Type</span>
          <select className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm">
            <option>Check-In</option>
            <option>Reservation Date</option>
            <option>Check-Out</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Source</span>
          <select value={source} onChange={(event) => setSource(event.target.value)} className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm">
            {sources.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="flex h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
          <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
          Show all
        </label>
        <ToolbarButton onClick={() => setToast("Reservations refreshed")}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </ToolbarButton>
      </div>

      <Panel title="Bookings" subtitle={`${filtered.length} reservations found`}>
        <ReservationTable reservations={filtered} />
      </Panel>

      {modalOpen ? (
        <AddReservationModal
          propertyId={propertyId}
          onClose={() => setModalOpen(false)}
          onSave={(booking) => {
            setReservations((current) => [booking, ...current]);
            setModalOpen(false);
            setToast("Reservation created");
          }}
        />
      ) : null}
    </Page>
  );
}

function ReservationTable({ reservations }: { reservations: Reservation[] }) {
  return (
    <div className="table-scroll overflow-x-auto">
      <table className="min-w-[1120px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-slate-500">
            {["Res No", "Booking Ref", "Reservation Date", "Check-In", "Check-Out", "Rooms", "Travel Agent", "Status", "Booker Name", "Phone", "Email", "Total"].map(
              (head) => (
                <th key={head} className="px-3 py-3 font-semibold">
                  {head}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {reservations.map((booking) => (
            <tr key={booking.id} className="border-b border-line hover:bg-slate-50">
              <td className="px-3 py-3 font-medium">{booking.resNo}</td>
              <td className="px-3 py-3">{booking.bookingRef}</td>
              <td className="px-3 py-3">{booking.reservationDate}</td>
              <td className="px-3 py-3">{booking.checkIn}</td>
              <td className="px-3 py-3">{booking.checkOut}</td>
              <td className="px-3 py-3">{booking.rooms}</td>
              <td className="px-3 py-3">{booking.source}</td>
              <td className="px-3 py-3">
                <StatusBadge status={booking.status} />
              </td>
              <td className="px-3 py-3 font-medium">{booking.guest}</td>
              <td className="px-3 py-3">{booking.phone}</td>
              <td className="px-3 py-3">{booking.email}</td>
              <td className="px-3 py-3 font-semibold">{currency(booking.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddReservationModal({
  propertyId,
  onClose,
  onSave
}: {
  propertyId: string;
  onClose: () => void;
  onSave: (booking: Reservation) => void;
}) {
  const [form, setForm] = useState({
    guest: "",
    phone: "",
    email: "",
    checkIn: property.systemDate,
    checkOut: "2026-06-19",
    roomType: roomTypes[0].name,
    room: roomTypes[0].rooms[0],
    source: "Direct",
    adults: 2,
    children: 0
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const type = roomTypes.find((item) => item.name === form.roomType) ?? roomTypes[0];
    const booking: Reservation = {
      id: `res-${Date.now()}`,
      resNo: String(1052700000 + Math.floor(Math.random() * 9000)),
      bookingRef: String(2000000000 + Math.floor(Math.random() * 90000000)),
      reservationDate: property.systemDate,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      rooms: 1,
      source: form.source,
      status: "Confirmed",
      guest: form.guest || "Walk-in Guest",
      phone: form.phone || "-",
      email: form.email || "-",
      country: "Sri Lanka",
      roomType: form.roomType,
      room: form.room,
      adults: Number(form.adults),
      children: Number(form.children),
      total: type.baseRate,
      paid: 0
    };
    await upsertRecord(propertyId, "reservations", booking);
    await appendActivity(propertyId, `Reservation ${booking.resNo} created for ${booking.guest}`);
    setSaving(false);
    onSave(booking);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-lg border border-line bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">New Reservation</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Guest name" value={form.guest} onChange={(value) => setForm({ ...form, guest: value })} />
          <Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <Field label="Source" value={form.source} onChange={(value) => setForm({ ...form, source: value })} />
          <Field label="Check-in" value={form.checkIn} onChange={(value) => setForm({ ...form, checkIn: value })} type="date" />
          <Field label="Check-out" value={form.checkOut} onChange={(value) => setForm({ ...form, checkOut: value })} type="date" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Room type</span>
            <select
              value={form.roomType}
              onChange={(event) => {
                const selected = roomTypes.find((item) => item.name === event.target.value) ?? roomTypes[0];
                setForm({ ...form, roomType: selected.name, room: selected.rooms[0] });
              }}
              className="focus-ring h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
            >
              {roomTypes.map((type) => (
                <option key={type.id}>{type.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Room</span>
            <select value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} className="focus-ring h-10 w-full rounded-md border border-line bg-white px-3 text-sm">
              {(roomTypes.find((type) => type.name === form.roomType)?.rooms ?? []).map((room) => (
                <option key={room}>{room}</option>
              ))}
            </select>
          </label>
          <Field label="Adults" value={String(form.adults)} onChange={(value) => setForm({ ...form, adults: Number(value) })} type="number" />
          <Field label="Children" value={String(form.children)} onChange={(value) => setForm({ ...form, children: Number(value) })} type="number" />
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
          <ToolbarButton type="submit" variant="primary" disabled={saving}>
            <Check className="h-4 w-4" />
            {saving ? "Saving..." : "Save Reservation"}
          </ToolbarButton>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="focus-ring h-10 w-full rounded-md border border-line bg-white px-3 text-sm" />
    </label>
  );
}

function BookingFormPage({ setToast, activePath }: ModuleProps & { mode: "event" | "cross" }) {
  const title = activePath.endsWith("cross-booking") ? "Cross Booking" : "Create Event";
  return (
    <Page>
      <Panel title={title} subtitle="Create operational blocks, maintenance windows, day-use stays, or linked room bookings.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Title" value="" onChange={() => undefined} />
          <Field label="Start Date" value={property.systemDate} onChange={() => undefined} type="date" />
          <Field label="End Date" value="2026-06-19" onChange={() => undefined} type="date" />
          <label className="block lg:col-span-3">
            <span className="mb-1 block text-sm font-medium">Notes</span>
            <textarea className="focus-ring min-h-32 w-full rounded-md border border-line bg-white px-3 py-2 text-sm" placeholder="Internal notes" />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <ToolbarButton variant="primary" onClick={() => setToast(`${title} saved`)}>
            <Save className="h-4 w-4" />
            Save
          </ToolbarButton>
        </div>
      </Panel>
    </Page>
  );
}

function FilteredBookingTable({ reservations, kind }: ModuleProps & { kind: "arrivals" | "departures" | "in-house" }) {
  const rows = reservations.filter((booking) => {
    if (kind === "arrivals") return booking.checkIn >= property.systemDate;
    if (kind === "departures") return booking.checkOut >= property.systemDate;
    return booking.status === "Checked-in" || booking.checkIn <= property.systemDate;
  });
  const title = kind === "arrivals" ? "Arrivals" : kind === "departures" ? "Departures" : "In-House";

  return (
    <Page>
      <Panel title={title} subtitle={`${rows.length} records`}>
        <ReservationTable reservations={rows} />
      </Panel>
    </Page>
  );
}

function TravelAgentsPage({ reservations }: ModuleProps) {
  const agents = Object.entries(
    reservations.reduce<Record<string, { count: number; revenue: number }>>((acc, booking) => {
      acc[booking.source] = acc[booking.source] ?? { count: 0, revenue: 0 };
      acc[booking.source].count += 1;
      acc[booking.source].revenue += booking.total;
      return acc;
    }, {})
  );

  return (
    <Page>
      <Panel title="Travel Agents" subtitle="Booking source performance">
        <SimpleTable
          headers={["Source", "Reservations", "Revenue", "Commission", "Status"]}
          rows={agents.map(([source, value]) => [source, value.count, currency(value.revenue), source === "Direct" ? "0%" : "12%", "Active"])}
        />
      </Panel>
    </Page>
  );
}

function GuestProfilesPage({ reservations }: ModuleProps) {
  return (
    <Page>
      <Panel title="Guest Profile" subtitle="Recent and upcoming guests">
        <SimpleTable
          headers={["Guest", "Phone", "Email", "Country", "Last Source", "Lifetime Value"]}
          rows={reservations.map((booking) => [booking.guest, booking.phone, booking.email, booking.country, booking.source, currency(booking.total)])}
        />
      </Panel>
    </Page>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <div className="table-scroll overflow-x-auto">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-slate-500">
            {headers.map((header) => (
              <th key={header} className="px-3 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-line hover:bg-slate-50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HousekeepingModule(props: ModuleProps) {
  if (props.activePath.endsWith("information")) return <HousekeepingInfoPage {...props} />;
  return <HousekeepingBoardPage {...props} />;
}

function HousekeepingBoardPage({ propertyId, roomList, setRoomList, setToast }: ModuleProps) {
  const [filter, setFilter] = useState<"All" | Room["housekeeping"]>("All");
  const [showDayEnd, setShowDayEnd] = useState(true);
  const filtered = filter === "All" ? roomList : roomList.filter((room) => room.housekeeping === filter);
  const counts = roomList.reduce<Record<string, number>>((acc, room) => {
    acc[room.housekeeping] = (acc[room.housekeeping] ?? 0) + 1;
    return acc;
  }, {});

  async function updateRoom(room: Room, housekeeping: Room["housekeeping"]) {
    const updated = { ...room, housekeeping };
    setRoomList((current) => current.map((item) => (item.id === room.id ? updated : item)));
    await upsertRecord(propertyId, "rooms", updated);
    setToast(`Room ${room.code} marked ${housekeeping}`);
  }

  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <ToolbarButton onClick={() => setToast("Housekeeping board refreshed")}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </ToolbarButton>
          {(["Clean", "Dirty", "Occupied", "WIP"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(filter === item ? "All" : item)}
              className={`h-10 rounded-md px-4 text-sm font-semibold ${filter === item ? "bg-ink text-white" : "border border-line bg-white text-slate-700"}`}
            >
              {item} {counts[item] ?? 0}
            </button>
          ))}
        </div>
        <SearchBox value="" onChange={() => undefined} placeholder="Search by room code / type / attendant" />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {filtered.map((room) => (
          <section key={room.id} className={`rounded-lg border bg-white p-4 shadow-sm ${housekeepingClass[room.housekeeping]}`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">{room.code}</p>
                <p className="text-sm text-slate-600">{room.type}</p>
              </div>
              <Badge className={housekeepingClass[room.housekeeping].replace("border-", "bg-").replace("bg-", "bg-").split(" ").slice(1).join(" ")}>
                {room.housekeeping}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">HK Attendant: {room.attendant || "-"}</p>
            <div className="my-4 border-t border-current/20" />
            <p className="mb-3 text-lg font-semibold">{room.status}</p>
            <div className="grid grid-cols-2 gap-2">
              <ToolbarButton onClick={() => updateRoom(room, "WIP")}>
                <Play className="h-4 w-4" />
                Start
              </ToolbarButton>
              <ToolbarButton variant="primary" onClick={() => updateRoom(room, "Clean")}>
                <Check className="h-4 w-4" />
                Complete
              </ToolbarButton>
            </div>
          </section>
        ))}
      </div>

      {showDayEnd ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <section className="w-full max-w-xl rounded-lg border border-line bg-white p-6 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Day End Process Required</h2>
              <button onClick={() => setShowDayEnd(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-slate-600">
              The property system date {property.systemDate} should be reviewed before finalizing housekeeping updates.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <ToolbarButton onClick={() => setShowDayEnd(false)}>Remind me later</ToolbarButton>
              <ToolbarButton
                variant="primary"
                onClick={() => {
                  setShowDayEnd(false);
                  setToast("Night audit checklist opened");
                }}
              >
                Run Day End Process
              </ToolbarButton>
            </div>
          </section>
        </div>
      ) : null}
    </Page>
  );
}

function HousekeepingInfoPage({ roomList }: ModuleProps) {
  return (
    <Page>
      <Panel title="Housekeeping Information" subtitle="Assignments, current room status, and work progress">
        <SimpleTable
          headers={["Room", "Room Type", "Floor", "Room Status", "HK Status", "Attendant"]}
          rows={roomList.map((room) => [room.code, room.type, room.floor, room.status, room.housekeeping, room.attendant])}
        />
      </Panel>
    </Page>
  );
}

function FinancialsModule(props: ModuleProps) {
  const path = props.activePath;
  if (path.endsWith("profit-loss")) return <ProfitLossPage {...props} />;
  if (path.endsWith("chart-of-accounts")) return <ChartOfAccountsPage />;
  if (path.endsWith("suppliers")) return <SuppliersPage />;
  if (path.endsWith("transfer-funds")) return <TransferFundsPage setToast={props.setToast} />;
  if (path.endsWith("integrations")) return <FinancialIntegrationsPage setToast={props.setToast} />;
  if (path.endsWith("purchases")) return <FinancialListPage title="Purchases" type="Purchase Order" />;
  if (path.endsWith("expenses")) return <FinancialListPage title="Expenses" type="Expense" />;
  if (path.endsWith("payables")) return <FinancialListPage title="Payables" type="Supplier Bill" />;
  if (path.endsWith("receivables")) return <FinancialListPage title="Receivables" type="Guest Invoice" />;
  return <TransactionsPage {...props} />;
}

function TransactionsPage({ transactions }: ModuleProps) {
  return (
    <Page>
      <Panel title="Transactions" subtitle="Financial and front office transactions">
        <SimpleTable
          headers={["Tran Date", "Tran Type", "Doc No", "Tran Value", "Reservation No", "Room No", "Created By", "Status", "Actions"]}
          rows={transactions.map((tran) => [
            dateLabel(tran.date),
            tran.type,
            tran.documentNo,
            currency(tran.value),
            tran.reservationNo,
            tran.roomNo,
            tran.createdBy,
            <Badge key={tran.id} className={tran.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
              {tran.status}
            </Badge>,
            <ToolbarButton key={`${tran.id}-view`}>
              <Eye className="h-4 w-4" />
              View
            </ToolbarButton>
          ])}
        />
      </Panel>
    </Page>
  );
}

function FinancialListPage({ title, type }: { title: string; type: string }) {
  const rows = [
    [`${type}-1001`, "Airport Supplies", dateLabel("2026-06-18"), currency(12500), "Pending"],
    [`${type}-1002`, "Laundry Partner", dateLabel("2026-06-16"), currency(7600), "Approved"],
    [`${type}-1003`, "Utility Provider", dateLabel("2026-06-15"), currency(33100), "Posted"]
  ];

  return (
    <Page>
      <Panel title={title} subtitle={`${type} register`}>
        <SimpleTable headers={["Document", "Party", "Date", "Amount", "Status"]} rows={rows} />
      </Panel>
    </Page>
  );
}

function ProfitLossPage({ transactions }: ModuleProps) {
  const income = transactions.reduce((sum, item) => sum + item.value, 0);
  const expenses = 61200;
  return (
    <Page>
      <div className="grid gap-4 xl:grid-cols-3">
        <MetricCard title="Income" value={currency(income)} detail="Posted revenue" tone="emerald" icon={<TrendingIcon />} />
        <MetricCard title="Expenses" value={currency(expenses)} detail="Operating costs" tone="orange" icon={<CreditCard />} />
        <MetricCard title="Net Profit" value={currency(income - expenses)} detail="Before tax" tone="blue" icon={<BarChart3 />} />
      </div>
      <Panel title="Profit & Loss">
        <SimpleTable
          headers={["Account", "This Month", "Last Month", "Variance"]}
          rows={[
            ["Room Revenue", currency(188500), currency(174200), "+8.2%"],
            ["POS Revenue", currency(36200), currency(31100), "+16.4%"],
            ["Housekeeping Supplies", currency(18200), currency(22100), "-17.6%"],
            ["Channel Fees", currency(14700), currency(13200), "+11.3%"]
          ]}
        />
      </Panel>
    </Page>
  );
}

function TrendingIcon() {
  return <BarChart3 className="h-5 w-5" />;
}

function ChartOfAccountsPage() {
  return (
    <Page>
      <Panel title="Chart of Accounts">
        <SimpleTable
          headers={["Code", "Account", "Type", "Normal Balance", "Status"]}
          rows={[
            ["1000", "Cash on Hand", "Asset", "Debit", "Active"],
            ["1200", "Accounts Receivable", "Asset", "Debit", "Active"],
            ["4000", "Room Revenue", "Income", "Credit", "Active"],
            ["5100", "OTA Commission", "Expense", "Debit", "Active"]
          ]}
        />
      </Panel>
    </Page>
  );
}

function SuppliersPage() {
  return (
    <Page>
      <Panel title="Suppliers">
        <SimpleTable
          headers={["Supplier", "Category", "Phone", "Balance", "Status"]}
          rows={[
            ["Airport Supplies", "Room Amenities", "+94 11 220 1122", currency(12500), "Active"],
            ["Fresh Linen Co", "Laundry", "+94 11 330 4411", currency(7600), "Active"],
            ["Utility Provider", "Utilities", "+94 11 550 9911", currency(33100), "Active"]
          ]}
        />
      </Panel>
    </Page>
  );
}

function TransferFundsPage({ setToast }: { setToast: (message: string) => void }) {
  return (
    <Page>
      <Panel title="Transfer Funds" subtitle="Move funds between cash, bank, and payment gateway accounts">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="From Account" value="Cash on Hand" onChange={() => undefined} />
          <Field label="To Account" value="Bank - Main" onChange={() => undefined} />
          <Field label="Amount" value="25000" onChange={() => undefined} type="number" />
          <Field label="Reference" value="TRF-20260618" onChange={() => undefined} />
        </div>
        <div className="mt-4 flex justify-end">
          <ToolbarButton variant="primary" onClick={() => setToast("Transfer posted")}>
            <Check className="h-4 w-4" />
            Post Transfer
          </ToolbarButton>
        </div>
      </Panel>
    </Page>
  );
}

function FinancialIntegrationsPage({ setToast }: { setToast: (message: string) => void }) {
  const cards = ["Payment Gateway", "Accounting Export", "Bank Reconciliation", "Tax Register"];
  return (
    <Page>
      <div className="grid gap-4 xl:grid-cols-4">
        {cards.map((card, index) => (
          <section key={card} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <PlugIcon />
            <h2 className="mt-4 text-lg font-semibold">{card}</h2>
            <p className="mt-1 text-sm text-slate-500">{index === 0 ? "Connected" : "Ready to configure"}</p>
            <ToolbarButton onClick={() => setToast(`${card} configuration opened`)}>
              <Settings className="h-4 w-4" />
              Configure
            </ToolbarButton>
          </section>
        ))}
      </div>
    </Page>
  );
}

function PlugIcon() {
  return <Zap className="h-8 w-8 text-ocean" />;
}

function ReportsPage({ setToast }: ModuleProps) {
  const reports = [
    "Manager Flash",
    "Occupancy Summary",
    "Arrival List",
    "Departure List",
    "Revenue by Source",
    "Housekeeping Productivity",
    "Tax Summary",
    "Night Audit Pack"
  ];

  return (
    <Page>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
        <Field label="Date From" value="2026-06-01" onChange={() => undefined} type="date" />
        <Field label="Date To" value={property.systemDate} onChange={() => undefined} type="date" />
        <ToolbarButton variant="primary" onClick={() => setToast("Report generated")}>
          <BarChart3 className="h-4 w-4" />
          Generate
        </ToolbarButton>
      </div>
      <div className="grid gap-4 xl:grid-cols-4">
        {reports.map((report) => (
          <section key={report} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <Database className="h-8 w-8 text-ocean" />
            <h2 className="mt-4 font-semibold">{report}</h2>
            <p className="mt-1 text-sm text-slate-500">PDF, CSV, and screen preview</p>
            <div className="mt-4 flex gap-2">
              <ToolbarButton onClick={() => setToast(`${report} preview opened`)}>
                <Eye className="h-4 w-4" />
                View
              </ToolbarButton>
              <ToolbarButton onClick={() => setToast(`${report} exported`)}>
                <Download className="h-4 w-4" />
                Export
              </ToolbarButton>
            </div>
          </section>
        ))}
      </div>
    </Page>
  );
}

function CrmModule(props: ModuleProps) {
  if (props.activePath.endsWith("campaigns")) return <CrmCampaignsModulePage {...props} />;
  return <CrmTemplatesModulePage {...props} />;
}

function CampaignsPage({ setToast }: { setToast: (message: string) => void }) {
  return (
    <Page>
      <Panel
        title="Campaigns"
        action={
          <ToolbarButton variant="primary" onClick={() => setToast("Campaign builder opened")}>
            <Send className="h-4 w-4" />
            Campaign
          </ToolbarButton>
        }
      >
        <SimpleTable
          headers={["Campaign", "Audience", "Sent", "Open Rate", "Status"]}
          rows={[
            ["Airport stopover offer", "Past guests", 412, "42%", "Running"],
            ["Long stay discount", "Corporate guests", 88, "36%", "Scheduled"],
            ["Direct booking promo", "OTA bookers", 240, "29%", "Draft"]
          ]}
        />
      </Panel>
    </Page>
  );
}

function ChannelManagerModule(props: ModuleProps) {
  const path = props.activePath;
  if (path.endsWith("request")) return <ChannelManagerRequestPage {...props} />;
  if (path.endsWith("dashboard")) return <ChannelManagerDashboardPage {...props} />;
  if (path.endsWith("channels")) return <ChannelManagerChannelsPage {...props} />;
  if (path.endsWith("inventory")) return <ChannelManagerInventoryPage {...props} />;
  if (path.endsWith("room-and-rates")) return <ChannelManagerRoomRatesPage {...props} />;
  if (path.endsWith("bookings")) return <ChannelManagerBookingsPage {...props} />;
  if (path.endsWith("logs")) return <ChannelManagerLogsPage {...props} />;
  if (path.endsWith("message")) return <ChannelManagerMessagePage {...props} />;
  if (path.endsWith("full-sync")) return <ChannelManagerFullSyncPage {...props} />;
  if (path.endsWith("pull-future-reservations")) return <ChannelManagerPullFutureReservationsPage {...props} />;
  return <ChannelManagerDashboardPage {...props} />;
}

function ChannelDashboardPage() {
  const totalBookings = channels.reduce((sum, channel) => sum + channel.bookings, 0);
  return (
    <Page>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Booking Sources">
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="grid h-40 w-40 place-items-center rounded-full border-[14px] border-amber border-b-slate-800 text-center">
              <div>
                <p className="text-sm text-slate-500">Bookings</p>
                <p className="text-3xl font-semibold">{totalBookings}</p>
              </div>
            </div>
            <div className="space-y-3">
              {channels.map((channel) => (
                <div key={channel.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                  <span className="font-semibold">{channel.name}</span>
                  <span>{channel.bookings}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Live Feed Events" action={<select className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm"><option>All Events</option></select>}>
          <div className="grid min-h-48 place-items-center text-center text-slate-500">
            <div>
              <Package className="mx-auto mb-2 h-10 w-10" />
              <p>No events in last 30 days</p>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Announcements">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>New OTA mapping status panel</li>
          <li>Booking acknowledge icon now checks the latest revision</li>
          <li>Future reservations pull includes rate plan mismatch detection</li>
        </ul>
      </Panel>
    </Page>
  );
}

function ChannelRequestPage({ setToast }: { setToast: (message: string) => void }) {
  return (
    <Page>
      <Panel title="Channel Requests" subtitle="Request OTA and metasearch connectivity">
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Channel Name" value="Booking.com" onChange={() => undefined} />
          <Field label="Property ID" value="RONAKA-001" onChange={() => undefined} />
          <Field label="Contact Email" value={property.email} onChange={() => undefined} />
        </div>
        <div className="mt-4 flex justify-end">
          <ToolbarButton variant="primary" onClick={() => setToast("Channel request submitted")}>
            <Send className="h-4 w-4" />
            Submit Request
          </ToolbarButton>
        </div>
      </Panel>
    </Page>
  );
}

function ChannelsPage({ setToast }: { setToast: (message: string) => void }) {
  return (
    <Page>
      <Panel title="Channels">
        <SimpleTable
          headers={["Channel", "Status", "Bookings", "Revenue", "Last Sync", "Action"]}
          rows={channels.map((channel) => [
            channel.name,
            <Badge key={channel.id} className={channel.status === "Connected" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
              {channel.status}
            </Badge>,
            channel.bookings,
            currency(channel.revenue),
            channel.lastSync,
            <ToolbarButton key={`${channel.id}-sync`} onClick={() => setToast(`${channel.name} synced`)}>
              <RefreshCw className="h-4 w-4" />
              Sync
            </ToolbarButton>
          ])}
        />
      </Panel>
    </Page>
  );
}

function ChannelInventoryPage({ reservations }: ModuleProps) {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${property.systemDate}T00:00:00`);
    date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  });

  return (
    <Page>
      <Panel title="Channel Inventory" subtitle="Availability published to connected channels">
        <SimpleTable
          headers={["Room Type", ...dates.map((date) => new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }))]}
          rows={roomTypes.map((type) => [
            type.name,
            ...dates.map((date) => {
              const occupied = reservations.filter((booking) => booking.roomType === type.name && date >= booking.checkIn && date < booking.checkOut).length;
              return Math.max(type.rooms.length - occupied, 0);
            })
          ])}
        />
      </Panel>
    </Page>
  );
}

function ChannelRoomRatesPage() {
  return (
    <Page>
      <Panel title="Channel Room and Rates">
        <SimpleTable
          headers={["Room Type", "Direct", "Agoda", "Expedia", "Booking.com", "Mapped"]}
          rows={roomTypes.map((type) => [type.name, currency(type.baseRate), currency(Math.round(type.baseRate * 1.12)), currency(Math.round(type.baseRate * 1.1)), currency(Math.round(type.baseRate * 1.14)), "Yes"])}
        />
      </Panel>
    </Page>
  );
}

function ChannelBookingsPage({ reservations }: { reservations: Reservation[] }) {
  return (
    <Page>
      <Panel title="Channel Bookings">
        <ReservationTable reservations={reservations.filter((booking) => booking.source !== "Direct")} />
      </Panel>
    </Page>
  );
}

function ChannelLogsPage() {
  return (
    <Page>
      <Panel title="Logs">
        <SimpleTable
          headers={["Time", "Channel", "Event", "Status"]}
          rows={[
            ["10:42", "Agoda", "Inventory update", "Success"],
            ["10:35", "Expedia", "Rate push", "Success"],
            ["09:58", "Booking.com", "Room mapping", "Warning"]
          ]}
        />
      </Panel>
    </Page>
  );
}

function ChannelMessagePage({ setToast }: { setToast: (message: string) => void }) {
  return (
    <Page>
      <Panel title="Channel Message">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Message</span>
          <textarea className="focus-ring min-h-40 w-full rounded-md border border-line px-3 py-2 text-sm" placeholder="Message for channel support" />
        </label>
        <div className="mt-4 flex justify-end">
          <ToolbarButton variant="primary" onClick={() => setToast("Message sent")}>
            <Send className="h-4 w-4" />
            Send Message
          </ToolbarButton>
        </div>
      </Panel>
    </Page>
  );
}

function ChannelActionPage({ title, action, setToast }: { title: string; action: string; setToast: (message: string) => void }) {
  return (
    <Page>
      <Panel title={title} subtitle="Synchronize inventory, rates, restrictions, and bookings with connected channels">
        <div className="grid gap-4 md:grid-cols-3">
          {["Inventory", "Rates", "Restrictions"].map((item) => (
            <label key={item} className="flex items-center gap-3 rounded-md border border-line p-4 text-sm font-semibold">
              <input type="checkbox" defaultChecked />
              {item}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <ToolbarButton variant="primary" onClick={() => setToast(`${title} started`)}>
            <RefreshCw className="h-4 w-4" />
            {action}
          </ToolbarButton>
        </div>
      </Panel>
    </Page>
  );
}

function SettingsModule(props: ModuleProps) {
  const path = props.activePath;
  if (path.endsWith("users")) return <UsersSettingsPage />;
  if (path.endsWith("templates")) return <SettingsTemplatesPage propertyId={props.propertyId} setToast={props.setToast} />;
  if (path.endsWith("data-import")) return <DataImportPage setToast={props.setToast} />;
  if (path.endsWith("activity-logs")) return <ActivityLogsPage />;
  if (path.endsWith("employee")) return <EmployeePage propertyId={props.propertyId} />;
  return <PropertySettingsPage propertyId={props.propertyId} setToast={props.setToast} />;
}
