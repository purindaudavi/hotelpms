"use client";

import { useState } from "react";
import { Download, Printer, X } from "lucide-react";
import type { Reservation } from "@/app/data/pms-data";
import { businessBlockMetrics } from "@/app/lib/business-block-repository";
import type { BusinessBlock, BusinessBlockAllocation, BusinessBlockLogEntry, BusinessBlockStatus } from "../types";
import { exportCsv } from "../utils";

type Props = {
  block: BusinessBlock;
  reservations: Reservation[];
  logs: BusinessBlockLogEntry[];
  onClose: () => void;
  onEdit: () => void;
  onStatus: (status: BusinessBlockStatus) => void;
  onRelease: () => void;
  onCreateReservation: (allocation: BusinessBlockAllocation) => void;
  onOpenReservation: (reservationId: string) => void;
  setToast: (message: string) => void;
};

export function BusinessBlockDetailDrawer(props: Props) {
  const { block, reservations, logs, onClose, onEdit, onStatus, onRelease, onCreateReservation, onOpenReservation, setToast } = props;
  const [tab, setTab] = useState<"Details" | "Rooming List" | "Log">("Details");
  const metrics = businessBlockMetrics(block, reservations);
  const linked = reservations.filter((reservation) => reservation.businessBlockId === block.id);
  const blockLogs = logs.filter((entry) => entry.businessBlockId === block.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function exportBlock() {
    exportCsv(`business-block-${block.blockNumber}.csv`, block.allocations.map((allocation) => {
      const row = metrics.allocationRows.find((item) => item.allocation.id === allocation.id)!;
      return { "Block No": block.blockNumber, "Block Name": block.blockName, Company: block.companyName, "Room Type": allocation.roomTypeName, Blocked: row.blocked, "Picked Up": row.pickedUp, Remaining: row.remaining, Released: row.released, Currency: allocation.currency, "Rate/Night": allocation.negotiatedRate };
    }));
    setToast("Business block CSV exported");
  }
  function printBlock() { window.print(); setToast("Print dialog opened"); }

  return <div className="fixed inset-0 z-[55] bg-black/40"><aside className="ml-auto flex h-full w-full max-w-[780px] flex-col bg-white shadow-2xl">
    <header className="border-b border-line p-5"><div className="flex justify-between gap-4"><div><h2 className="text-xl font-semibold">{block.blockName}</h2><p className="text-sm text-slate-500">{block.blockNumber} · {block.companyName}</p><span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{block.status}</span>{block.status === "Active" && block.cutoffDate < new Date().toISOString().slice(0, 10) ? <span className="ml-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Release due</span> : null}</div><button type="button" onClick={onClose} className="rounded-md border border-line p-2"><X className="h-5 w-5" /></button></div>
      <div className="mt-4 flex flex-wrap gap-2"><Action onClick={onEdit}>Edit</Action>{block.status === "Tentative" ? <Action onClick={() => onStatus("Active")} dark>Activate</Action> : null}{block.status === "Active" ? <><Action onClick={() => onCreateReservation(block.allocations[0])} dark>Create Reservation</Action><Action onClick={onRelease}>Release Remaining Rooms</Action><Action onClick={() => onStatus("Cancelled")} danger>Cancel Block</Action></> : null}<Action onClick={exportBlock}><Download className="h-4 w-4" />Export CSV</Action><Action onClick={printBlock}><Printer className="h-4 w-4" />Print</Action></div>
    </header>
    <div className="flex-1 overflow-y-auto p-5"><div className="grid grid-cols-3 rounded-md bg-slate-100 p-1">{(["Details", "Rooming List", "Log"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded px-3 py-2 text-sm font-semibold ${tab === item ? "bg-white shadow" : "text-slate-500"}`}>{item}</button>)}</div>
      {tab === "Details" ? <div className="space-y-5"><BlockSection title="Stay and contact"><Grid items={[["Company", block.companyName], ["Contact", block.contactName || "No contact name"], ["Email", block.contactEmail || "No contact email"], ["Phone", block.contactPhone || "No contact phone"], ["Check-in", block.checkIn], ["Check-out", block.checkOut], ["Cut-off", block.cutoffDate], ["Status", block.status]]} /></BlockSection>
        <BlockSection title="Allocation and pickup"><div className="overflow-x-auto"><table className="min-w-[700px] text-left text-sm"><thead><tr className="border-b border-line text-slate-500">{["Room Type", "Blocked", "Picked", "Remaining", "Released", "Rate", "Action"].map((heading) => <th key={heading} className="px-2 py-3">{heading}</th>)}</tr></thead><tbody>{metrics.allocationRows.map((row) => <tr key={row.allocation.id} className="border-b border-line"><td className="px-2 py-3"><b>{row.allocation.roomTypeName}</b><p className="text-xs text-slate-500">{row.allocation.ratePlanName || "Custom"} · {row.allocation.mealPlan}</p></td><td className="px-2">{row.blocked}</td><td className="px-2">{row.pickedUp}</td><td className="px-2">{row.remaining}</td><td className="px-2">{row.released}</td><td className="px-2">{row.allocation.currency} {row.allocation.negotiatedRate.toLocaleString()}</td><td className="px-2">{block.status === "Active" && row.remaining > 0 ? <button type="button" onClick={() => onCreateReservation(row.allocation)} className="text-xs font-semibold text-blue-700">Create reservation</button> : "—"}</td></tr>)}</tbody></table></div><div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm"><Metric label="Blocked" value={metrics.blocked} /><Metric label="Picked" value={metrics.pickedUp} /><Metric label="Remaining" value={metrics.remaining} /><Metric label="Released" value={metrics.released} /></div></BlockSection>
        <BlockSection title="Billing"><Grid items={[["Billing party", block.billingParty], ["Payment method", block.paymentMethod || "Not specified"], ["Estimated value", `${block.allocations[0]?.currency || ""} ${metrics.estimatedValue.toLocaleString()}`], ["Deposit required", `${block.allocations[0]?.currency || ""} ${block.depositRequired.toLocaleString()}`], ["Deposit paid", `${block.allocations[0]?.currency || ""} ${block.depositPaid.toLocaleString()}`], ["Balance", `${block.allocations[0]?.currency || ""} ${metrics.balance.toLocaleString()}`], ["Payment due", block.paymentDueDate || "Not specified"], ["Billing remarks", block.billingRemarks || "No billing remarks"]]} /></BlockSection>
        <BlockSection title="Policies and notes"><Note label="Cancellation policy" value={block.cancellationPolicy} /><Note label="Block remarks" value={block.blockRemarks} /><Note label="Internal remarks · Staff only" value={block.internalRemarks} staff /><Note label="Special requirements" value={block.specialRequirements} /></BlockSection>
      </div> : null}
      {tab === "Rooming List" ? <BlockSection title="Business Block Rooming List"><p className="mb-3 text-sm text-slate-500">Linked reservations and rooms waiting for guest names.</p>{linked.map((reservation) => <button type="button" key={reservation.id} onClick={() => onOpenReservation(reservation.id)} className="mb-2 flex w-full justify-between rounded-md border border-line p-3 text-left text-sm hover:bg-slate-50"><span><b>{reservation.guest || "Guest name pending"}</b><br /><span className="text-xs text-slate-500">{reservation.resNo} · {(reservation.reservationRooms ?? []).map((room) => room.roomNumber || "Unassigned").join(", ") || "Room assignment pending"}</span></span><span>{reservation.status}</span></button>)}{!linked.length ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No linked reservations; all {metrics.remaining} remaining room(s) are waiting for guest names.</p> : null}<div className="mt-3 flex gap-2"><Action onClick={() => exportCsv(`block-rooming-${block.blockNumber}.csv`, linked.map((reservation) => ({ "Reservation No": reservation.resNo, Guest: reservation.guest, Rooms: (reservation.reservationRooms ?? []).map((room) => room.roomNumber).join(" "), Status: reservation.status })))}>Export CSV</Action><Action onClick={printBlock}>Print</Action></div></BlockSection> : null}
      {tab === "Log" ? <BlockSection title="Append-only Prototype Block Log"><p className="mb-3 text-xs text-slate-500">Read-only localStorage history; not production audit immutability.</p>{blockLogs.map((entry) => <article key={entry.id} className="mb-2 rounded-md border border-line p-3 text-sm"><div className="flex justify-between"><b>{entry.action}</b><time className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</time></div><p className="mt-2 text-slate-600">{entry.description}</p><p className="mt-1 text-xs text-slate-500">By {entry.createdBy}</p></article>)}{!blockLogs.length ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No block log entries yet</p> : null}</BlockSection> : null}
    </div>
  </aside></div>;
}

function Action({ children, onClick, dark, danger }: { children: React.ReactNode; onClick: () => void; dark?: boolean; danger?: boolean }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${danger ? "border-red-600 bg-red-600 text-white" : dark ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>{children}</button>; }
function BlockSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mt-5 rounded-lg border border-line p-4"><h3 className="mb-4 font-semibold">{title}</h3>{children}</section>; }
function Grid({ items }: { items: Array<[string, string]> }) { return <dl className="grid gap-4 text-sm sm:grid-cols-2">{items.map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap font-semibold">{value}</dd></div>)}</dl>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-md bg-slate-50 p-3"><b className="text-lg">{value}</b><p className="text-xs text-slate-500">{label}</p></div>; }
function Note({ label, value, staff }: { label: string; value?: string; staff?: boolean }) { return <div className={`mb-2 rounded-md border p-3 text-sm ${staff ? "border-amber-200 bg-amber-50" : "border-line bg-slate-50"}`}><b>{label}</b><p className="mt-1 whitespace-pre-wrap text-slate-600">{value?.trim() || `No ${label.toLowerCase()}`}</p></div>; }
