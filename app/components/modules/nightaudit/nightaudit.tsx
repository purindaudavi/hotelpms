"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Hotel,
  Loader2,
  Moon,
  RefreshCw,
  Save,
  ShieldCheck,
  WalletCards,
  XCircle
} from "lucide-react";
import { dateLabel } from "@/app/data/pms-data";
import {
  completeNightAudit,
  generateNightAuditReports,
  getCurrentNightAudit,
  getNightAuditApiErrorMessage,
  getNightAuditHistory,
  overrideNightAuditExceptions,
  postNightAuditRoomRevenue,
  reviewNightAuditChannels,
  reviewNightAuditHousekeeping,
  reviewNightAuditStep,
  saveNightAuditNote,
  type NightAudit,
  type NightAuditHistoryRecord,
  type NightAuditStep,
  type NightAuditStepStatus
} from "@/app/lib/night-audit-api";

type NightAuditPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

const expectedReports = [
  "Business Analysis",
  "Deposit Ledger",
  "Occupancy by Date",
  "Revenue Report",
  "Inventory By Room Type",
  "List of Reservations"
];

const statusClass: Record<NightAuditStepStatus, string> = {
  done: "bg-emerald-50 text-emerald-700",
  reviewed_with_warnings: "bg-amber-50 text-amber-700",
  ready: "bg-blue-50 text-blue-700",
  warning: "bg-amber-50 text-amber-700",
  blocked: "bg-rose-50 text-rose-700",
  disabled: "bg-slate-100 text-slate-500"
};

export function NightAuditPage({ propertyId, setToast }: NightAuditPageProps) {
  const [audit, setAudit] = useState<NightAudit | null>(null);
  const [history, setHistory] = useState<NightAuditHistoryRecord[]>([]);
  const [closeNote, setCloseNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadAudit(false);
  }, [propertyId]);

  const requiredSteps = useMemo(() => audit?.steps.filter((step) => step.required) ?? [], [audit]);
  const completedRequired = requiredSteps.filter((step) => isCompleteStatus(step.status)).length;
  const blockerCount = audit?.blockers.length ?? 0;
  const warningCount = audit?.steps.reduce(
    (total, step) => total + step.exceptions.filter((exception) => exception.severity === "warning" && !exception.resolved).length,
    0
  ) ?? 0;
  const busy = Boolean(action);

  async function loadAudit(showToast: boolean) {
    setLoading(true);
    setErrorMessage("");
    try {
      const [current, closedAudits] = await Promise.all([
        getCurrentNightAudit(propertyId),
        getNightAuditHistory(propertyId)
      ]);
      setAudit(current);
      setHistory(closedAudits);
      setCloseNote(current.close_note || "");
      if (showToast) setToast("Night Audit refreshed from MongoDB");
    } catch (error) {
      const message = getNightAuditApiErrorMessage(error);
      setErrorMessage(message);
      if (showToast) setToast(message);
    } finally {
      setLoading(false);
    }
  }

  async function runAction(key: string, operation: () => Promise<NightAudit>, successMessage: string) {
    if (busy) return;
    setAction(key);
    setErrorMessage("");
    try {
      const current = await operation();
      setAudit(current);
      setCloseNote(current.close_note || closeNote);
      setToast(successMessage);
    } catch (error) {
      const message = getNightAuditApiErrorMessage(error);
      setErrorMessage(message);
      setToast(message);
    } finally {
      setAction("");
    }
  }

  function reviewStep(step: NightAuditStep) {
    if (step.disabled || isCompleteStatus(step.status)) return;
    if (step.id === "folio-posting") {
      void runAction(step.id, () => postNightAuditRoomRevenue(propertyId), "Room revenue posted to MongoDB");
      return;
    }
    if (step.id === "housekeeping-close") {
      void runAction(step.id, () => reviewNightAuditHousekeeping(propertyId), "Housekeeping board reviewed");
      return;
    }
    if (step.id === "channel-check") {
      void runAction(step.id, () => reviewNightAuditChannels(propertyId), "Channel check reviewed");
      return;
    }
    if (step.id === "audit-reports") {
      void runAction(step.id, () => generateNightAuditReports(propertyId), "Night Audit close pack generated in MongoDB");
      return;
    }
    void runAction(step.id, () => reviewNightAuditStep(propertyId, step.id), `${step.title} reviewed`);
  }

  function requestManagerOverride(step: NightAuditStep) {
    const blockerIds = step.exceptions
      .filter((exception) => exception.severity === "blocker" && !exception.resolved)
      .map((exception) => exception.id);
    if (!blockerIds.length) return;
    const reason = window.prompt("Enter the duty manager's override reason (at least 10 characters):", "");
    if (!reason) return;
    if (reason.trim().length < 10) {
      setToast("The override reason must contain at least 10 characters");
      return;
    }
    void runAction(
      `override:${step.id}`,
      () => overrideNightAuditExceptions(propertyId, step.id, blockerIds, reason.trim()),
      `${step.title} override recorded with manager reason`
    );
  }

  function saveNote() {
    void runAction("note", () => saveNightAuditNote(propertyId, closeNote), "Close note saved to MongoDB");
  }

  async function finishAudit() {
    if (!audit?.can_complete || busy) return;
    const confirmed = window.confirm(
      `Close business date ${audit.business_date} and open ${addDays(audit.business_date, 1)}? This cannot be undone from this screen.`
    );
    if (!confirmed) return;
    setAction("complete");
    setErrorMessage("");
    try {
      const result = await completeNightAudit(propertyId, closeNote);
      setToast(result.message);
      const [nextAudit, closedAudits] = await Promise.all([
        getCurrentNightAudit(propertyId),
        getNightAuditHistory(propertyId)
      ]);
      setAudit(nextAudit);
      setHistory(closedAudits);
      setCloseNote(nextAudit.close_note || "");
    } catch (error) {
      const message = getNightAuditApiErrorMessage(error);
      setErrorMessage(message);
      setToast(message);
    } finally {
      setAction("");
    }
  }

  function downloadAuditPack() {
    if (!audit) return;
    const blob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `night-audit-${audit.business_date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setToast("Current MongoDB Night Audit snapshot downloaded");
  }

  if (loading && !audit) {
    return (
      <main className="grid min-h-[calc(100vh-72px)] place-items-center bg-white p-6">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Night Audit from MongoDB...
        </div>
      </main>
    );
  }

  if (!audit) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-white p-4 lg:p-6">
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <h1 className="text-xl font-semibold">Night Audit could not be loaded</h1>
          <p className="mt-2 text-sm">{errorMessage || "Check that the backend and MongoDB are running."}</p>
          <button type="button" onClick={() => void loadAudit(true)} className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white">
            Try Again
          </button>
        </section>
      </main>
    );
  }

  const snapshot = audit.snapshot;
  const reportTitles = audit.reports.length ? audit.reports.map((report) => report.title) : expectedReports;
  const folioStep = findStep(audit, "folio-posting");
  const housekeepingStep = findStep(audit, "housekeeping-close");
  const reportsStep = findStep(audit, "audit-reports");

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">Night Audit</h1>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">MongoDB live</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Close the business day after front desk, housekeeping, financials, and reports are reviewed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-slate-50 px-3 text-sm font-semibold" title="The business date advances only after Complete Audit.">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <input type="date" value={audit.business_date} readOnly disabled className="border-0 bg-transparent p-0 disabled:opacity-100" />
          </label>
          <button type="button" onClick={() => void loadAudit(true)} disabled={busy || loading} className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button type="button" onClick={downloadAuditPack} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
            <Download className="h-4 w-4" />
            Download Pack
          </button>
          <button type="button" onClick={() => void finishAudit()} className="inline-flex h-11 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={!audit.can_complete || busy}>
            {action === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Moon className="h-4 w-4" />}
            Complete Audit
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <section className="mt-5 grid gap-4 xl:grid-cols-5">
        <SummaryCard label="Business Date" value={dateLabel(audit.business_date)} helper={`Next close opens ${dateLabel(addDays(audit.business_date, 1))}`} icon={<CalendarDays className="h-5 w-5" />} />
        <SummaryCard label="Occupied Rooms" value={String(snapshot.occupied_rooms)} helper={`${snapshot.available_rooms} available`} icon={<Hotel className="h-5 w-5" />} />
        <SummaryCard label="Revenue To Post" value={money(snapshot.currency, snapshot.revenue_posted ? snapshot.revenue_posted_amount : snapshot.estimated_room_revenue)} helper={`${snapshot.transaction_count} posted transactions today`} icon={<WalletCards className="h-5 w-5" />} />
        <SummaryCard label="Open Balances" value={money(snapshot.currency, snapshot.open_balance_total)} helper={`${snapshot.open_balances.length} folios with balance`} icon={<FileText className="h-5 w-5" />} />
        <SummaryCard label="Exceptions" value={`${blockerCount} / ${warningCount}`} helper="Blockers / warnings" icon={<AlertTriangle className="h-5 w-5" />} />
      </section>

      <section className="mt-5 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Audit Progress</h2>
            <p className="mt-1 text-sm text-slate-500">{completedRequired} of {requiredSteps.length} required checks completed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickAction label="Post Room Revenue" actionKey="folio-posting" activeAction={action} disabled={busy || isCompleteStatus(folioStep.status)} onClick={() => reviewStep(folioStep)} />
            <QuickAction label="Review Housekeeping" actionKey="housekeeping-close" activeAction={action} disabled={busy || isCompleteStatus(housekeepingStep.status)} onClick={() => reviewStep(housekeepingStep)} />
            <QuickAction label="Generate Reports" actionKey="audit-reports" activeAction={action} disabled={busy || isCompleteStatus(reportsStep.status)} primary onClick={() => reviewStep(reportsStep)} />
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${Math.round((completedRequired / Math.max(requiredSteps.length, 1)) * 100)}%` }} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-4">
          {audit.steps.map((step) => {
            const active = action === step.id || action === `override:${step.id}`;
            const blockers = step.exceptions.filter((exception) => exception.severity === "blocker" && !exception.resolved);
            const allowOverride = step.id === "front-desk-status" && blockers.length > 0;
            return (
              <article key={step.id} className={`rounded-lg border border-line bg-white p-5 shadow-sm ${step.disabled ? "opacity-75" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      {statusIcon(step.status)}
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[step.status]}`}>{statusLabel(step.status)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{step.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{step.metric}</p>
                    <p className="text-xs text-slate-500">{step.required ? "Required" : "Not required"}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Evidence</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {stepEvidence(step.id, audit).map((item) => (
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
                        {step.exceptions.map((exception) => (
                          <div key={exception.id} className="rounded-md border border-line bg-white p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold">{exception.label}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${exception.resolved ? "bg-emerald-50 text-emerald-700" : exception.severity === "blocker" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                                {exception.resolved ? "Overridden" : titleCase(exception.severity)}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-500">{exception.detail}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">No exceptions for this audit check.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  {allowOverride ? (
                    <button type="button" onClick={() => requestManagerOverride(step)} disabled={busy} className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                      Manager Override
                    </button>
                  ) : null}
                  {!step.disabled && !isCompleteStatus(step.status) ? (
                    <button type="button" onClick={() => reviewStep(step)} disabled={busy || (step.status === "blocked" && !["folio-posting", "audit-reports"].includes(step.id))} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                      {active ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {stepActionLabel(step)}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Audit Reports</h2>
            <div className="mt-4 space-y-2">
              {reportTitles.map((report) => (
                <div key={report} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
                  <span>{report}</span>
                  {audit.reports_generated_at ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-slate-400" />}
                </div>
              ))}
            </div>
            {audit.reports_generated_at ? (
              <p className="mt-3 text-xs text-slate-500">Generated {formatDateTime(audit.reports_generated_at)}</p>
            ) : (
              <p className="mt-3 text-xs text-amber-600">Generate reports before completing the audit.</p>
            )}
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Close Notes</h2>
            <textarea value={closeNote} onChange={(event) => setCloseNote(event.target.value)} placeholder="Optional handover notes for the next shift..." className="focus-ring mt-4 min-h-32 w-full rounded-md border border-line px-3 py-2 text-sm" />
            <button type="button" onClick={saveNote} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
              {action === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Note
            </button>
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Previous Closes</h2>
            {history.length ? (
              <div className="mt-4 space-y-3">
                {history.slice(0, 5).map((record) => (
                  <div key={record._id} className="rounded-md border border-line p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{dateLabel(record.business_date)}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Closed</span>
                    </div>
                    <p className="mt-2 text-slate-500">Closed by {record.closed_by?.name || "System"}</p>
                    <p className="mt-1 text-slate-500">Revenue {money(record.currency, record.revenue_posted_amount)} | Open balance {money(record.currency, record.close_summary?.open_balance_total || 0)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No completed Night Audits in MongoDB yet.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function QuickAction({ label, actionKey, activeAction, disabled, primary = false, onClick }: {
  label: string;
  actionKey: string;
  activeAction: string;
  disabled: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 ${primary ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-line bg-white hover:bg-slate-50"}`}>
      {activeAction === actionKey ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  );
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

function findStep(audit: NightAudit, stepId: string) {
  const step = audit.steps.find((item) => item.id === stepId);
  if (!step) throw new Error(`Night Audit step ${stepId} was not returned by the API.`);
  return step;
}

function isCompleteStatus(status: NightAuditStepStatus) {
  return status === "done" || status === "reviewed_with_warnings";
}

function statusLabel(status: NightAuditStepStatus) {
  if (status === "reviewed_with_warnings") return "Done with warnings";
  return titleCase(status);
}

function statusIcon(status: NightAuditStepStatus) {
  if (status === "done") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (status === "reviewed_with_warnings" || status === "warning") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  if (status === "ready") return <ShieldCheck className="h-5 w-5 text-blue-600" />;
  if (status === "disabled") return <ShieldCheck className="h-5 w-5 text-slate-400" />;
  return <XCircle className="h-5 w-5 text-rose-600" />;
}

function stepActionLabel(step: NightAuditStep) {
  if (step.id === "folio-posting") return "Post Room Revenue";
  if (step.id === "housekeeping-close") return "Review Housekeeping";
  if (step.id === "channel-check") return "Review Channels";
  if (step.id === "audit-reports") return "Generate Reports";
  return "Mark Reviewed";
}

function stepEvidence(stepId: string, audit: NightAudit) {
  const snapshot = audit.snapshot;
  if (stepId === "front-desk-status") {
    return [
      `${snapshot.due_arrivals.length} arrivals due today`,
      `${snapshot.due_departures.length} checked-in departures due`,
      `${snapshot.in_house.length} active in-house stays`
    ];
  }
  if (stepId === "folio-posting") {
    return [
      `${snapshot.transaction_count} posted financial transactions on the audit date`,
      `${money(snapshot.currency, snapshot.estimated_room_revenue)} calculated room revenue`
    ];
  }
  if (stepId === "payment-reconciliation") {
    return [
      `${money(snapshot.currency, snapshot.deposit_total)} deposits and paid amounts recorded`,
      `${snapshot.open_balances.length} reservations have a remaining balance`
    ];
  }
  if (stepId === "housekeeping-close") {
    return [
      `${snapshot.available_rooms} rooms available`,
      `${snapshot.occupied_rooms} rooms occupied`,
      `${snapshot.dirty_rooms.length} dirty or in-progress rooms`
    ];
  }
  if (stepId === "channel-check") {
    return snapshot.channel_manager.connected
      ? ["Live Channel Manager integration connected"]
      : ["No live Channel Manager API is connected", "This check is not required for close"];
  }
  return audit.reports_generated_at
    ? [`${audit.reports.length} reports generated ${formatDateTime(audit.reports_generated_at)}`]
    : [`${expectedReports.length} reports required for close`];
}

function money(currency: string, value: number) {
  return `${currency} ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
