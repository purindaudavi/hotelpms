"use client";

import { type Dispatch, type SetStateAction, useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Hotel,
  Moon,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  XCircle
} from "lucide-react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { currency, dateLabel, type FinancialTransaction, property, type Reservation, type Room } from "@/app/data/pms-data";
import {
  channelBookingsKey,
  channelLogsKey,
  type ChannelBookingSessionRecord,
  type ChannelLogEntry,
  initialChannelBookings
} from "@/app/components/modules/channelmanager/session";

type NightAuditPageProps = {
  propertyId: string;
  reservations: Reservation[];
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
  roomList: Room[];
  setRoomList: Dispatch<SetStateAction<Room[]>>;
  transactions: FinancialTransaction[];
  setTransactions: Dispatch<SetStateAction<FinancialTransaction[]>>;
  setToast: (message: string) => void;
};

type AuditException = {
  id: string;
  label: string;
  detail: string;
  severity: "Blocker" | "Warning";
};

type AuditStep = {
  id: string;
  title: string;
  description: string;
  metric: string;
  required: boolean;
  exceptions: AuditException[];
  evidence: string[];
};

type AuditRecord = {
  id: string;
  businessDate: string;
  closedAt: string;
  closedBy: string;
  status: "Closed";
  revenuePosted: number;
  depositTotal: number;
  openBalance: number;
  occupiedRooms: number;
  availableRooms: number;
  exceptionsResolved: number;
  reports: string[];
};

type NightAuditState = {
  businessDate: string;
  reviewedStepIds: string[];
  resolvedExceptionIds: string[];
  reportGenerated: boolean;
  reportGeneratedAt: string;
  closeNote: string;
  records: AuditRecord[];
};

type AuditSnapshot = {
  dueArrivals: Reservation[];
  overdueArrivals: Reservation[];
  dueDepartures: Reservation[];
  inHouseReservations: Reservation[];
  todayTransactions: FinancialTransaction[];
  openBalances: Reservation[];
  dirtyRooms: Room[];
  outOfOrderRooms: Room[];
  unackedChannelBookings: ChannelBookingSessionRecord[];
  lastFullSync: ChannelLogEntry | null;
  roomRevenueAccrual: number;
  depositTotal: number;
  openBalanceTotal: number;
  availableRooms: number;
  occupiedRooms: number;
};

const auditReports = [
  "Manager Flash",
  "Deposit Ledger",
  "Occupancy Summary",
  "Revenue by Source",
  "Housekeeping Status",
  "Channel Exceptions"
];

const statusClass = {
  Done: "bg-emerald-50 text-emerald-700",
  Ready: "bg-blue-50 text-blue-700",
  Warning: "bg-amber-50 text-amber-700",
  Blocked: "bg-rose-50 text-rose-700"
};

export function NightAuditPage({
  propertyId,
  reservations,
  setReservations,
  roomList,
  setRoomList,
  transactions,
  setTransactions,
  setToast
}: NightAuditPageProps) {
  const [auditState, setAuditState] = useSessionState<NightAuditState>(nightAuditKey(propertyId), createInitialNightAuditState);
  const [channelBookings, setChannelBookings] = useSessionState<ChannelBookingSessionRecord[]>(channelBookingsKey(propertyId), initialChannelBookings);
  const [channelLogs] = useSessionState<ChannelLogEntry[]>(channelLogsKey(propertyId), []);

  const snapshot = useMemo(
    () => buildAuditSnapshot(auditState.businessDate, reservations, roomList, transactions, channelBookings, channelLogs),
    [auditState.businessDate, reservations, roomList, transactions, channelBookings, channelLogs]
  );

  const steps = useMemo(() => buildAuditSteps(auditState, snapshot), [auditState, snapshot]);
  const completedRequired = steps.filter((step) => step.required && getStepStatus(step, auditState) === "Done").length;
  const requiredTotal = steps.filter((step) => step.required).length;
  const blockerCount = steps.reduce((count, step) => count + unresolvedBlockers(step, auditState).length, 0);
  const warningCount = steps.reduce((count, step) => count + step.exceptions.filter((exception) => exception.severity === "Warning").length, 0);
  const canComplete = requiredTotal > 0 && completedRequired === requiredTotal && blockerCount === 0;

  function setBusinessDate(value: string) {
    setAuditState((current) => ({
      ...current,
      businessDate: value,
      reviewedStepIds: [],
      resolvedExceptionIds: [],
      reportGenerated: false,
      reportGeneratedAt: ""
    }));
    setToast(`Night audit date set to ${dateLabel(value)}`);
  }

  function markStepReviewed(step: AuditStep) {
    setAuditState((current) => ({
      ...current,
      reviewedStepIds: Array.from(new Set([...current.reviewedStepIds, step.id]))
    }));
    setToast(`${step.title} reviewed`);
  }

  function resolveStepExceptions(step: AuditStep) {
    setAuditState((current) => ({
      ...current,
      reviewedStepIds: Array.from(new Set([...current.reviewedStepIds, step.id])),
      resolvedExceptionIds: Array.from(new Set([...current.resolvedExceptionIds, ...step.exceptions.map((exception) => exception.id)]))
    }));
    setToast(`${step.title} exceptions resolved for this session`);
  }

  function postRoomRevenue() {
    if (snapshot.roomRevenueAccrual <= 0) {
      setToast("No room revenue to post for this date");
      return;
    }

    const documentNo = `NA-REV-${compactDate(auditState.businessDate)}`;
    const alreadyPosted = transactions.some((transaction) => transaction.documentNo === documentNo);
    if (alreadyPosted) {
      setToast("Room revenue is already posted for this audit date");
      return;
    }

    setTransactions((current) => [
      {
        id: `night-audit-revenue-${Date.now()}`,
        date: auditState.businessDate,
        type: "Night Audit Room Revenue",
        documentNo,
        value: snapshot.roomRevenueAccrual,
        reservationNo: "-",
        roomNo: "-",
        createdBy: "Night Audit",
        status: "Active"
      },
      ...current
    ]);
    setAuditState((current) => ({
      ...current,
      reviewedStepIds: Array.from(new Set([...current.reviewedStepIds, "folio-posting", "payment-reconciliation"]))
    }));
    setToast("Room revenue posted for this session");
  }

  function closeHousekeepingBoard() {
    setRoomList((current) =>
      current.map((room) => {
        if (room.status === "Occupied") return { ...room, housekeeping: "Occupied" };
        if (room.housekeeping === "Dirty" || room.housekeeping === "WIP") return { ...room, housekeeping: "Clean" };
        return room;
      })
    );
    setAuditState((current) => ({
      ...current,
      reviewedStepIds: Array.from(new Set([...current.reviewedStepIds, "housekeeping-close"])),
      resolvedExceptionIds: Array.from(new Set([...current.resolvedExceptionIds, ...snapshot.dirtyRooms.map((room) => `housekeeping:${room.id}`)]))
    }));
    setToast("Housekeeping board closed for this session");
  }

  function acknowledgeChannelBookings() {
    const unackedIds = new Set(snapshot.unackedChannelBookings.map((booking) => booking.id));
    if (!unackedIds.size) {
      setToast("No unacknowledged channel reservations");
      return;
    }

    setChannelBookings((current) => current.map((booking) => (unackedIds.has(booking.id) ? { ...booking, acked: true } : booking)));
    setAuditState((current) => ({
      ...current,
      reviewedStepIds: Array.from(new Set([...current.reviewedStepIds, "channel-check"])),
      resolvedExceptionIds: Array.from(new Set([...current.resolvedExceptionIds, ...snapshot.unackedChannelBookings.map((booking) => `channel:${booking.id}`)]))
    }));
    setToast("Channel reservations acknowledged for this session");
  }

  function generateAuditReports() {
    setAuditState((current) => ({
      ...current,
      reportGenerated: true,
      reportGeneratedAt: new Date().toISOString(),
      reviewedStepIds: Array.from(new Set([...current.reviewedStepIds, "audit-reports"]))
    }));
    setToast("Night audit reports generated");
  }

  function resetAudit() {
    setAuditState((current) => ({
      ...current,
      reviewedStepIds: [],
      resolvedExceptionIds: [],
      reportGenerated: false,
      reportGeneratedAt: "",
      closeNote: ""
    }));
    setToast("Night audit checklist reset");
  }

  function completeAudit() {
    if (!canComplete) {
      setToast("Resolve required audit checks before completing night audit");
      return;
    }

    const closeTransactionNo = `NA-CLOSE-${compactDate(auditState.businessDate)}`;
    setTransactions((current) => {
      if (current.some((transaction) => transaction.documentNo === closeTransactionNo)) return current;
      return [
        {
          id: `night-audit-close-${Date.now()}`,
          date: auditState.businessDate,
          type: "Night Audit Close",
          documentNo: closeTransactionNo,
          value: snapshot.todayTransactions.reduce((sum, transaction) => sum + transaction.value, 0),
          reservationNo: "-",
          roomNo: "-",
          createdBy: "Night Audit",
          status: "Active"
        },
        ...current
      ];
    });

    setReservations((current) =>
      current.map((reservation) => {
        if (reservation.status === "Checked-in" && reservation.checkOut <= auditState.businessDate) return { ...reservation, status: "Checked-out" };
        return reservation;
      })
    );

    const record: AuditRecord = {
      id: `night-audit-${Date.now()}`,
      businessDate: auditState.businessDate,
      closedAt: new Date().toISOString(),
      closedBy: "ASIRI PERERA",
      status: "Closed",
      revenuePosted: snapshot.todayTransactions.reduce((sum, transaction) => sum + transaction.value, 0),
      depositTotal: snapshot.depositTotal,
      openBalance: snapshot.openBalanceTotal,
      occupiedRooms: snapshot.occupiedRooms,
      availableRooms: snapshot.availableRooms,
      exceptionsResolved: auditState.resolvedExceptionIds.length,
      reports: auditReports
    };

    setAuditState((current) => ({
      ...current,
      businessDate: addDays(current.businessDate, 1),
      reviewedStepIds: [],
      resolvedExceptionIds: [],
      reportGenerated: false,
      reportGeneratedAt: "",
      closeNote: "",
      records: [record, ...current.records]
    }));
    setToast("Night audit completed and next business date opened");
  }

  function downloadAuditPack() {
    const payload = {
      property: property.name,
      businessDate: auditState.businessDate,
      generatedAt: new Date().toISOString(),
      summary: {
        occupiedRooms: snapshot.occupiedRooms,
        availableRooms: snapshot.availableRooms,
        roomRevenueAccrual: snapshot.roomRevenueAccrual,
        depositTotal: snapshot.depositTotal,
        openBalanceTotal: snapshot.openBalanceTotal,
        blockerCount,
        warningCount
      },
      reports: auditReports,
      steps: steps.map((step) => ({
        id: step.id,
        title: step.title,
        status: getStepStatus(step, auditState),
        metric: step.metric,
        exceptions: step.exceptions
      }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `night-audit-${auditState.businessDate}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Night audit pack downloaded");
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Night Audit</h1>
          <p className="mt-1 text-sm text-slate-500">Close the business day after front desk, housekeeping, financials, reports, and channel checks are reviewed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <input type="date" value={auditState.businessDate} onChange={(event) => setBusinessDate(event.target.value)} className="focus-ring border-0 bg-transparent p-0" />
          </label>
          <button type="button" onClick={resetAudit} className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
          <button type="button" onClick={downloadAuditPack} className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Download Pack
          </button>
          <button type="button" onClick={completeAudit} className="inline-flex h-11 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={!canComplete}>
            <Moon className="h-4 w-4" />
            Complete Audit
          </button>
        </div>
      </div>

      <section className="mt-5 grid gap-4 xl:grid-cols-5">
        <SummaryCard label="Business Date" value={dateLabel(auditState.businessDate)} helper={`Next close opens ${dateLabel(addDays(auditState.businessDate, 1))}`} icon={<CalendarDays className="h-5 w-5" />} />
        <SummaryCard label="Occupied Rooms" value={String(snapshot.occupiedRooms)} helper={`${snapshot.availableRooms} available`} icon={<Hotel className="h-5 w-5" />} />
        <SummaryCard label="Revenue To Post" value={currency(snapshot.roomRevenueAccrual)} helper={`${snapshot.todayTransactions.length} transactions today`} icon={<WalletCards className="h-5 w-5" />} />
        <SummaryCard label="Open Balances" value={currency(snapshot.openBalanceTotal)} helper={`${snapshot.openBalances.length} folios with balance`} icon={<FileText className="h-5 w-5" />} />
        <SummaryCard label="Exceptions" value={`${blockerCount} / ${warningCount}`} helper="Blockers / warnings" icon={<AlertTriangle className="h-5 w-5" />} />
      </section>

      <section className="mt-5 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Audit Progress</h2>
            <p className="mt-1 text-sm text-slate-500">{completedRequired} of {requiredTotal} required checks completed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={postRoomRevenue} className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Post Room Revenue</button>
            <button type="button" onClick={closeHousekeepingBoard} className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Close Housekeeping</button>
            <button type="button" onClick={acknowledgeChannelBookings} className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Ack Channels</button>
            <button type="button" onClick={generateAuditReports} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Generate Reports</button>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((completedRequired / Math.max(requiredTotal, 1)) * 100)}%` }} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-4">
          {steps.map((step) => {
            const status = getStepStatus(step, auditState);
            const blockers = unresolvedBlockers(step, auditState);
            return (
              <article key={step.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      {statusIcon(status)}
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[status]}`}>{status}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{step.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{step.metric}</p>
                    <p className="text-xs text-slate-500">{step.required ? "Required" : "Optional"}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Evidence</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {step.evidence.map((item) => (
                        <li key={item} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-md bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Exceptions</p>
                    {step.exceptions.length ? (
                      <div className="mt-3 space-y-2">
                        {step.exceptions.map((exception) => {
                          const resolved = auditState.resolvedExceptionIds.includes(exception.id);
                          return (
                            <div key={exception.id} className="rounded-md border border-line bg-white p-3 text-sm">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold">{exception.label}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${exception.severity === "Blocker" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                                  {resolved ? "Resolved" : exception.severity}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-500">{exception.detail}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">No exceptions for this audit check.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  {blockers.length ? (
                    <button type="button" onClick={() => resolveStepExceptions(step)} className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                      Resolve For Session
                    </button>
                  ) : null}
                  <button type="button" onClick={() => markStepReviewed(step)} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                    Mark Reviewed
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Audit Reports</h2>
            <div className="mt-4 space-y-2">
              {auditReports.map((report) => (
                <div key={report} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
                  <span>{report}</span>
                  {auditState.reportGenerated ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-slate-400" />}
                </div>
              ))}
            </div>
            {auditState.reportGenerated ? (
              <p className="mt-3 text-xs text-slate-500">Generated {formatDateTime(auditState.reportGeneratedAt)}</p>
            ) : (
              <p className="mt-3 text-xs text-amber-600">Generate reports before completing the audit.</p>
            )}
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Close Notes</h2>
            <textarea
              value={auditState.closeNote}
              onChange={(event) => setAuditState((current) => ({ ...current, closeNote: event.target.value }))}
              placeholder="Optional handover notes for the next shift..."
              className="focus-ring mt-4 min-h-32 w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Previous Closes</h2>
            {auditState.records.length ? (
              <div className="mt-4 space-y-3">
                {auditState.records.slice(0, 5).map((record) => (
                  <div key={record.id} className="rounded-md border border-line p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{dateLabel(record.businessDate)}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{record.status}</span>
                    </div>
                    <p className="mt-2 text-slate-500">Closed by {record.closedBy}</p>
                    <p className="mt-1 text-slate-500">Revenue {currency(record.revenuePosted)} | Open balance {currency(record.openBalance)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No night audit close records in this session yet.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function buildAuditSnapshot(
  businessDate: string,
  reservations: Reservation[],
  rooms: Room[],
  transactions: FinancialTransaction[],
  channelBookings: ChannelBookingSessionRecord[],
  channelLogs: ChannelLogEntry[]
): AuditSnapshot {
  const activeReservations = reservations.filter((reservation) => !["Cancelled", "No Show", "Blocked"].includes(reservation.status));
  const dueArrivals = activeReservations.filter((reservation) => reservation.checkIn === businessDate && ["Confirmed", "Tentative"].includes(reservation.status));
  const overdueArrivals = activeReservations.filter((reservation) => reservation.checkIn < businessDate && ["Confirmed", "Tentative"].includes(reservation.status));
  const dueDepartures = activeReservations.filter((reservation) => reservation.checkOut <= businessDate && reservation.status === "Checked-in");
  const inHouseReservations = activeReservations.filter((reservation) => isInHouse(reservation, businessDate));
  const todayTransactions = transactions.filter((transaction) => transaction.date === businessDate && transaction.status === "Active");
  const openBalances = activeReservations.filter((reservation) => Math.max(reservation.total - reservation.paid, 0) > 0);
  const dirtyRooms = rooms.filter((room) => room.housekeeping === "Dirty" || room.housekeeping === "WIP");
  const outOfOrderRooms = rooms.filter((room) => room.status === "Out of Order" || room.status === "Maintenance");
  const unackedChannelBookings = channelBookings.filter((booking) => !booking.acked);
  const lastFullSync = channelLogs.find((log) => log.event.toLowerCase().includes("full sync")) ?? null;
  const roomRevenueAccrual = activeReservations.reduce((sum, reservation) => {
    if (!isInHouse(reservation, businessDate) && reservation.checkIn !== businessDate) return sum;
    return sum + reservation.total / Math.max(reservationNights(reservation), 1);
  }, 0);
  const depositTotal = activeReservations.reduce((sum, reservation) => sum + reservation.paid, 0);
  const openBalanceTotal = openBalances.reduce((sum, reservation) => sum + Math.max(reservation.total - reservation.paid, 0), 0);
  const occupiedRooms = rooms.filter((room) => room.status === "Occupied" || room.housekeeping === "Occupied").length;
  const availableRooms = rooms.filter((room) => room.status === "Available").length;

  return {
    dueArrivals,
    overdueArrivals,
    dueDepartures,
    inHouseReservations,
    todayTransactions,
    openBalances,
    dirtyRooms,
    outOfOrderRooms,
    unackedChannelBookings,
    lastFullSync,
    roomRevenueAccrual,
    depositTotal,
    openBalanceTotal,
    availableRooms,
    occupiedRooms
  };
}

function buildAuditSteps(state: NightAuditState, snapshot: AuditSnapshot): AuditStep[] {
  return [
    {
      id: "front-desk-status",
      title: "Front Desk Status",
      description: "Review arrivals, departures, in-house guests, no-shows, and checkout readiness.",
      metric: `${snapshot.inHouseReservations.length} in-house`,
      required: true,
      exceptions: [
        ...snapshot.overdueArrivals.map((reservation) => ({
          id: `arrival-overdue:${reservation.id}`,
          label: `${reservation.resNo} overdue arrival`,
          detail: `${reservation.guest} was due on ${dateLabel(reservation.checkIn)} and is still ${reservation.status}.`,
          severity: "Blocker" as const
        })),
        ...snapshot.dueDepartures.map((reservation) => ({
          id: `departure:${reservation.id}`,
          label: `${reservation.resNo} due departure`,
          detail: `${reservation.guest} checks out on ${dateLabel(reservation.checkOut)} and is still checked in.`,
          severity: "Blocker" as const
        })),
        ...snapshot.dueArrivals.map((reservation) => ({
          id: `arrival-today:${reservation.id}`,
          label: `${reservation.resNo} arrival due`,
          detail: `${reservation.guest} arrives today from ${reservation.source}. Confirm check-in or hold status.`,
          severity: "Warning" as const
        }))
      ],
      evidence: [
        `${snapshot.dueArrivals.length} arrivals due today`,
        `${snapshot.dueDepartures.length} checked-in departures due`,
        `${snapshot.inHouseReservations.length} active in-house stays`
      ]
    },
    {
      id: "folio-posting",
      title: "Post Pending Folio Charges",
      description: "Post room revenue and verify the day has financial activity for occupied rooms.",
      metric: currency(snapshot.todayTransactions.reduce((sum, transaction) => sum + transaction.value, 0)),
      required: true,
      exceptions: [
        ...(snapshot.roomRevenueAccrual > 0 && !snapshot.todayTransactions.some((transaction) => transaction.type === "Night Audit Room Revenue")
          ? [
              {
                id: "folio:room-revenue",
                label: "Room revenue not posted",
                detail: `${currency(snapshot.roomRevenueAccrual)} estimated room revenue is ready to post for this audit date.`,
                severity: "Warning" as const
              }
            ]
          : [])
      ],
      evidence: [
        `${snapshot.todayTransactions.length} active financial transactions on the audit date`,
        `${currency(snapshot.roomRevenueAccrual)} calculated room revenue for current stays`
      ]
    },
    {
      id: "payment-reconciliation",
      title: "Reconcile Payments",
      description: "Review deposits, open balances, and payment collection before closing the day.",
      metric: currency(snapshot.depositTotal),
      required: true,
      exceptions: snapshot.openBalances.slice(0, 5).map((reservation) => ({
        id: `balance:${reservation.id}`,
        label: `${reservation.resNo} open balance`,
        detail: `${reservation.guest} has ${currency(Math.max(reservation.total - reservation.paid, 0))} outstanding.`,
        severity: "Warning" as const
      })),
      evidence: [
        `${currency(snapshot.depositTotal)} deposits and paid amounts recorded`,
        `${snapshot.openBalances.length} reservations have remaining balance`
      ]
    },
    {
      id: "housekeeping-close",
      title: "Close Housekeeping Board",
      description: "Confirm room cleanliness and maintenance status for the next operating day.",
      metric: `${snapshot.dirtyRooms.length} open`,
      required: true,
      exceptions: [
        ...snapshot.dirtyRooms.map((room) => ({
          id: `housekeeping:${room.id}`,
          label: `Room ${room.code} ${room.housekeeping}`,
          detail: `${room.type} is assigned to ${room.attendant}.`,
          severity: "Blocker" as const
        })),
        ...snapshot.outOfOrderRooms.map((room) => ({
          id: `room-status:${room.id}`,
          label: `Room ${room.code} ${room.status}`,
          detail: `${room.type} must be accepted by night audit before close.`,
          severity: "Warning" as const
        }))
      ],
      evidence: [
        `${snapshot.availableRooms} rooms available`,
        `${snapshot.occupiedRooms} rooms occupied`,
        `${snapshot.outOfOrderRooms.length} rooms out of order or maintenance`
      ]
    },
    {
      id: "channel-check",
      title: "Channel Manager Check",
      description: "Confirm OTA reservations are acknowledged and the latest inventory sync is known.",
      metric: `${snapshot.unackedChannelBookings.length} unacked`,
      required: true,
      exceptions: snapshot.unackedChannelBookings.map((booking) => ({
        id: `channel:${booking.id}`,
        label: `${booking.uniqueId} not acknowledged`,
        detail: `${booking.source} reservation for ${booking.customer.name} is still unacknowledged.`,
        severity: "Blocker" as const
      })),
      evidence: [
        snapshot.lastFullSync ? `Last full sync: ${snapshot.lastFullSync.time}` : "No full sync log in this session",
        `${snapshot.unackedChannelBookings.length} unacknowledged channel reservations`
      ]
    },
    {
      id: "audit-reports",
      title: "Generate Audit Reports",
      description: "Generate the close pack before finalizing the day.",
      metric: state.reportGenerated ? "Ready" : "Pending",
      required: true,
      exceptions: state.reportGenerated
        ? []
        : [
            {
              id: "reports:pack",
              label: "Night audit pack not generated",
              detail: "Generate Manager Flash, Deposit Ledger, Occupancy Summary, Revenue by Source, Housekeeping Status, and Channel Exceptions.",
              severity: "Blocker" as const
            }
          ],
      evidence: state.reportGenerated ? [`Reports generated ${formatDateTime(state.reportGeneratedAt)}`] : [`${auditReports.length} reports required for close`]
    }
  ];
}

function SummaryCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-50 text-slate-600">{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </section>
  );
}

function statusIcon(status: "Done" | "Ready" | "Warning" | "Blocked") {
  if (status === "Done") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (status === "Ready") return <ShieldCheck className="h-5 w-5 text-blue-600" />;
  if (status === "Warning") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  return <XCircle className="h-5 w-5 text-rose-600" />;
}

function getStepStatus(step: AuditStep, state: NightAuditState): "Done" | "Ready" | "Warning" | "Blocked" {
  const blockers = unresolvedBlockers(step, state);
  const reviewed = state.reviewedStepIds.includes(step.id);
  if (step.id === "audit-reports" && state.reportGenerated) return "Done";
  if (reviewed && blockers.length === 0) return "Done";
  if (blockers.length > 0) return "Blocked";
  if (step.exceptions.some((exception) => exception.severity === "Warning")) return "Warning";
  return "Ready";
}

function unresolvedBlockers(step: AuditStep, state: NightAuditState) {
  return step.exceptions.filter((exception) => exception.severity === "Blocker" && !state.resolvedExceptionIds.includes(exception.id));
}

function createInitialNightAuditState(): NightAuditState {
  return {
    businessDate: property.systemDate,
    reviewedStepIds: [],
    resolvedExceptionIds: [],
    reportGenerated: false,
    reportGeneratedAt: "",
    closeNote: "",
    records: []
  };
}

function nightAuditKey(propertyId: string) {
  return `staypilot:${propertyId}:night-audit`;
}

function isInHouse(reservation: Reservation, businessDate: string) {
  return reservation.status === "Checked-in" || (reservation.checkIn <= businessDate && reservation.checkOut > businessDate && !["Cancelled", "No Show", "Blocked"].includes(reservation.status));
}

function reservationNights(reservation: Reservation) {
  const start = new Date(`${reservation.checkIn}T00:00:00`);
  const end = new Date(`${reservation.checkOut}T00:00:00`);
  const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Number.isFinite(nights) ? Math.max(1, nights) : 1;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compactDate(value: string) {
  return value.replaceAll("-", "");
}

function formatDateTime(value: string) {
  if (!value) return "Not generated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not generated";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
