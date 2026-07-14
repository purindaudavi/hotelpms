"use client";

import { type ReactNode, useMemo, useState } from "react";
import { CheckCircle2, ChevronsUpDown, Copy, Download, Filter, Printer, RefreshCw, Search, X } from "lucide-react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { type ChannelBookingSessionRecord, channelBookingsKey, initialChannelBookings } from "@/app/components/modules/channelmanager/session";

type ChannelManagerBookingsPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

type BookingTab = "info" | "revisions" | "timeline";

type ChannelBookingRecord = ChannelBookingSessionRecord;

export function ChannelManagerBookingsPage({ propertyId, setToast }: ChannelManagerBookingsPageProps) {
  const [bookings] = useSessionState<ChannelBookingRecord[]>(channelBookingsKey(propertyId), initialChannelBookings);
  const [search, setSearch] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState<ChannelBookingRecord | null>(null);

  const visibleBookings = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const haystack = [booking.status, booking.uniqueId, booking.propertyName, booking.customer.name, booking.source, booking.checkIn, booking.checkOut].join(" ").toLowerCase();
      const matchesSearch = !needle || haystack.includes(needle);
      const matchesSource = sourceFilter === "All" || booking.source === sourceFilter;
      const matchesStatus = statusFilter === "All" || booking.status === statusFilter;
      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [bookings, search, sourceFilter, statusFilter]);

  function exportCsv() {
    const header = ["Status", "Unique ID", "Property", "Customer", "Dates", "Rooms Count", "Acked", "Total"];
    const rows = visibleBookings.map((booking) => [
      booking.status,
      booking.uniqueId,
      booking.propertyName,
      booking.customer.name,
      `${booking.checkIn} -> ${booking.checkOut}`,
      booking.roomsCount,
      booking.acked ? "Yes" : "No",
      `${booking.total.toFixed(2)} USD`
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "channel-bookings.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Channel bookings exported");
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-4 py-4">
      <section className="rounded-md border border-line bg-white">
        <div className="flex flex-wrap items-center border-b border-line">
          <label className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className="focus-ring h-12 w-full border-0 bg-white pl-11 pr-4 text-sm" />
          </label>
          <button type="button" onClick={() => setAdvancedOpen((current) => !current)} className="inline-flex h-12 items-center gap-2 border-l border-line px-5 text-sm font-semibold hover:bg-slate-50">
            <Filter className="h-4 w-4" />
            Advanced Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setToast("Bookings refreshed");
            }}
            className="inline-flex h-12 items-center gap-2 border-l border-line px-5 text-sm font-semibold hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button type="button" onClick={exportCsv} className="m-2 inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-5 text-sm font-semibold hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        {advancedOpen ? (
          <div className="grid gap-4 border-b border-line bg-slate-50 px-5 py-4 md:grid-cols-3">
            <Field label="Source / OTA">
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="focus-ring h-10 w-full rounded-md border border-line bg-white px-3 text-sm">
                <option>All</option>
                <option>Agoda</option>
                <option>Expedia</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="focus-ring h-10 w-full rounded-md border border-line bg-white px-3 text-sm">
                <option>All</option>
                <option>New</option>
                <option>Modified</option>
                <option>Cancelled</option>
              </select>
            </Field>
            <Field label="Property">
              <input value={bookings[0]?.propertyName ?? "Ronaka Airport Hotel"} disabled className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-slate-500" />
            </Field>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-white text-slate-900">
                {["Status", "Unique ID", "Property", "Customer", "Dates", "Rooms Count", "Acked", "Total", "Actions"].map((heading) => (
                  <th key={heading} className={`px-5 py-5 font-semibold ${heading === "Actions" ? "text-right" : ""}`}>
                    <span className={`inline-flex items-center gap-2 ${heading === "Actions" ? "justify-end" : ""}`}>
                      {heading}
                      {["Unique ID", "Property", "Status"].includes(heading) ? <ChevronsUpDown className="h-4 w-4 text-slate-300" /> : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleBookings.map((booking) => (
                <tr key={booking.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-5">
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-5 py-5">{booking.uniqueId}</td>
                  <td className="px-5 py-5">{booking.propertyName}</td>
                  <td className="px-5 py-5">{booking.customer.name}</td>
                  <td className="px-5 py-5">
                    {booking.checkIn} <span className="mx-2">-&gt;</span> {booking.checkOut}
                  </td>
                  <td className="px-5 py-5">{booking.roomsCount}</td>
                  <td className="px-5 py-5">
                    {booking.acked ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="text-slate-400">No</span>}
                  </td>
                  <td className="px-5 py-5">{booking.total.toFixed(2)} USD</td>
                  <td className="px-5 py-5 text-right">
                    <button type="button" onClick={() => setSelected(booking)} className="font-semibold text-blue-500 hover:text-blue-700">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-4 px-5 py-5 text-sm">
          <button type="button" className="text-slate-300">
            {"<"}
          </button>
          {[1, 2, 3, 4, 5].map((page) => (
            <button key={page} type="button" className={page === 1 ? "rounded border border-blue-500 px-2 py-1 text-blue-600" : "text-slate-700"}>
              {page}
            </button>
          ))}
          <span className="text-slate-400">...</span>
          <button type="button" className="text-slate-700">
            63
          </button>
          <button type="button" className="text-slate-500">
            {">"}
          </button>
        </div>
      </section>

      {selected ? <BookingDrawer booking={selected} onClose={() => setSelected(null)} setToast={setToast} /> : null}
    </main>
  );
}

function BookingDrawer({ booking, onClose, setToast }: { booking: ChannelBookingRecord; onClose: () => void; setToast: (message: string) => void }) {
  const [tab, setTab] = useState<BookingTab>("info");
  const [copied, setCopied] = useState("");

  function copyValue(label: string, value: string) {
    void navigator.clipboard?.writeText(value);
    setCopied(label);
    setToast(`${label} copied`);
    window.setTimeout(() => setCopied(""), 1400);
  }

  function printBooking() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45">
      <div className="hidden flex-1 bg-black/20 lg:block" onClick={onClose} />
      <aside className="flex h-full w-full max-w-[640px] flex-col bg-white shadow-2xl">
        <div className="flex items-center gap-4 px-6 py-5">
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold">Booking {booking.uniqueId}</h2>
        </div>
        <div className="flex items-center justify-between border-b border-line px-6">
          <div className="flex gap-7">
            <TabButton active={tab === "info"} onClick={() => setTab("info")}>
              Info
            </TabButton>
            <TabButton active={tab === "revisions"} onClick={() => setTab("revisions")}>
              Revisions
            </TabButton>
            <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")}>
              Timeline
            </TabButton>
          </div>
          <button type="button" onClick={printBooking} className="mb-2 inline-flex h-9 items-center gap-2 rounded border border-line px-4 text-sm hover:bg-slate-50">
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 text-sm">
          {tab === "info" ? <BookingInfo booking={booking} copied={copied} onCopy={copyValue} /> : null}
          {tab === "revisions" ? <BookingRevisions booking={booking} copied={copied} onCopy={copyValue} /> : null}
          {tab === "timeline" ? <BookingTimeline booking={booking} /> : null}
        </div>
      </aside>
    </div>
  );
}

function BookingInfo({
  booking,
  copied,
  onCopy
}: {
  booking: ChannelBookingRecord;
  copied: string;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-2 text-center">
        <DetailRow label="Status" value={<span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{booking.status}</span>} />
        <DetailRow label="Source / OTA" value={booking.source} />
        <DetailRow label="Channel" value={<span className="text-blue-500">{booking.channel}</span>} />
        <CopyRow label="Reservation ID" value={booking.reservationId} copied={copied === "Reservation ID"} onCopy={() => onCopy("Reservation ID", booking.reservationId)} />
        <CopyRow label="Booking ID" value={booking.bookingId} copied={copied === "Booking ID"} onCopy={() => onCopy("Booking ID", booking.bookingId)} />
        <CopyRow label="Revision ID" value={booking.revisionId} copied={copied === "Revision ID"} onCopy={() => onCopy("Revision ID", booking.revisionId)} />
        <DetailRow label="OTA Reservation ID" value={booking.otaReservationId} />
        <DetailRow label="Booked At" value={booking.bookedAt} />
        <DetailRow label="Property" value={<span className="text-blue-500">{booking.propertyName}</span>} />
      </section>

      <InfoSection title="Checkin Details">
        <DetailRow label="Checkin Date" value={booking.checkIn} />
        <DetailRow label="Checkout Date" value={booking.checkOut} />
        <DetailRow label="Arrival Time" value={booking.arrivalTime} />
        <DetailRow label="Nights" value={String(booking.nights)} />
        <DetailRow label="Rooms" value={String(booking.roomsCount)} />
        <DetailRow label="Occupancy" value={booking.occupancy} />
      </InfoSection>

      <InfoSection title="Customer">
        <DetailRow label="Name" value={booking.customer.name} />
        <DetailRow label="Email" value={booking.customer.email} />
        <DetailRow label="Phone" value={booking.customer.phone} />
        <DetailRow label="Language" value={booking.customer.language} />
        <DetailRow label="Country" value={booking.customer.country} />
        <DetailRow label="City" value={booking.customer.city} />
        <DetailRow label="Address" value={booking.customer.address} />
        <DetailRow label="Postal Code" value={booking.customer.postalCode} />
      </InfoSection>

      <InfoSection title="Rooms">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">{booking.roomName}</p>
            <p className="mt-1 text-xs text-slate-500">{booking.checkIn} - {booking.checkOut}</p>
          </div>
          <p className="font-semibold">{booking.total.toFixed(2)} USD</p>
        </div>
      </InfoSection>

      <InfoSection title="Guarantee">
        <p className="italic">{booking.guarantee}</p>
      </InfoSection>

      <InfoSection title="Notes">
        <p>Benefits: {booking.benefits}</p>
        <p>Requests: {booking.requests}</p>
        {booking.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
        <p>Payment Collect: {booking.paymentCollect}</p>
      </InfoSection>

      <InfoSection title="Booking Expenses">
        <DetailRow label="Total Amount" value={`${booking.total.toFixed(2)} USD`} />
        <DetailRow label="Payment Method" value={booking.paymentMethod} />
        <DetailRow label="Deposits" value={booking.deposits} />
      </InfoSection>
    </div>
  );
}

function BookingRevisions({
  booking,
  copied,
  onCopy
}: {
  booking: ChannelBookingRecord;
  copied: string;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <div className="rounded border border-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="font-semibold">System ID: j6jGyE99KPAWTk1-Au55jg</p>
          <p className="text-xs text-slate-500">June 15th 2026, 19:31:57</p>
        </div>
        <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">New</span>
      </div>
      <div className="px-5 py-5">
        <BookingInfo booking={booking} copied={copied} onCopy={onCopy} />
        <button type="button" className="mt-6 w-full text-center text-blue-500 hover:text-blue-700">
          View Raw Message
        </button>
      </div>
    </div>
  );
}

function BookingTimeline({ booking }: { booking: ChannelBookingRecord }) {
  const events = [
    ["2026-06-15", "19:31:57", "Booking Created", `Revision ID: ${booking.revisionId}`, true],
    ["2026-06-15", "19:31:57", "Property Email Notification Sent", "", false],
    ["2026-06-15", "19:31:57", "Web-hook sent", "URL: https://liveapi365.hotelmate.app/api/Reservation/webhook\nIs Success: Yes", false],
    ["2026-06-15", "19:31:58", "Booking Revision received via feed", "IP Address: 216.52.25.130\nUser: Citrus PMS (citruspms@gmail.com)", false],
    ["2026-06-15", "19:31:59", "Booking Revision is acknowledged", `Revision ID: ${booking.revisionId}\nIP Address: 216.52.25.130\nUser: Citrus PMS (citruspms@gmail.com)`, false]
  ] as const;

  return (
    <div className="space-y-7">
      {events.map(([date, time, title, detail, completed], index) => (
        <div key={`${title}-${index}`} className="grid grid-cols-[100px_24px_1fr] gap-4">
          <div className="text-right text-slate-600">
            <p>{date}</p>
            <p className="text-xs">{time}</p>
          </div>
          <div className="relative flex justify-center">
            <span className={`mt-1 h-4 w-4 rounded-full border-2 ${completed ? "border-emerald-500 bg-emerald-50" : "border-blue-500 bg-white"}`} />
            {index < events.length - 1 ? <span className="absolute top-5 h-16 w-px bg-line" /> : null}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
            {detail ? (
              <div className="mt-2 whitespace-pre-line text-slate-600">
                {detail}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="border-b border-line pb-2 text-base text-slate-400">{title}</h3>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-3">
      <span className="text-right font-semibold">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function CopyRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-3">
      <span className="text-right font-semibold">{label}:</span>
      <span className="relative inline-flex items-center gap-2">
        {value}
        <button type="button" onClick={onCopy} className="text-blue-500 hover:text-blue-700" aria-label={`Copy ${label}`}>
          <Copy className="h-4 w-4" />
        </button>
        {copied ? <span className="absolute left-full ml-2 rounded bg-slate-900 px-2 py-1 text-xs text-white">Copied</span> : null}
      </span>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`border-b-2 px-1 pb-4 text-sm font-semibold ${active ? "border-blue-500 text-blue-500" : "border-transparent text-slate-700 hover:text-blue-500"}`}>
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
