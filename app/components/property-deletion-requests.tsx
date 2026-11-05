"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { RefreshCw, X } from "lucide-react";
import { useColorScheme } from "@/app/components/hooks/use-color-scheme";
import { getApiErrorMessage } from "@/app/lib/api";
import { hasStoredWorkspaceSession, loadCurrentSessionUser } from "@/app/lib/current-user";
import { cancelPropertyDeletion, getDeletionContext, listPropertyDeletions, reviewPropertyDeletion, submitPropertyDeletion, type DeletionContext, type PropertyDeletionRequest } from "@/app/lib/property-deletion-api";

const inputClass = "mt-2 w-full rounded-lg border border-line bg-white p-3 font-normal text-ink";
const buttonClass = "rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50";
const statusLabels = { pending: "Pending", approved: "Approved — archived", rejected: "Rejected", cancelled: "Cancelled" };
const date = (value: string) => new Date(value).toLocaleString();

export function PropertyDeletionDialog({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const [context, setContext] = useState<DeletionContext | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const [phone, setPhone] = useState(""), [reason, setReason] = useState(""), [confirmation, setConfirmation] = useState("");
  const [submitted, setSubmitted] = useState<PropertyDeletionRequest | null>(null), [stale, setStale] = useState(false);
  const lock = useRef(false), generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError(""); setContext(null);
    try {
      const result = await getDeletionContext(propertyId);
      if (current === generation.current) { setContext(result); setPhone(result.account.mobile); setConfirmation(""); setStale(false); }
    } catch (failure) { if (current === generation.current) setError(getApiErrorMessage(failure, "Could not load this property's request form.")); }
    finally { if (current === generation.current) setLoading(false); }
  }, [propertyId]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!context || lock.current || stale) return;
    lock.current = true; setSaving(true); setError("");
    try {
      const result = await submitPropertyDeletion(propertyId, { version: context.property.version, confirm_name: confirmation, contact_phone: phone.trim(), reason: reason.trim() });
      setSubmitted(result.request);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not submit the deletion request."));
      if (isAxiosError(failure) && failure.response?.status === 409) setStale(true);
    } finally { lock.current = false; setSaving(false); }
  }
  return <div role="dialog" aria-modal="true" aria-labelledby="property-deletion-title" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 sm:items-center">
    <section className="my-4 w-full max-w-xl space-y-5 rounded-2xl border border-line bg-white p-5 shadow-2xl sm:p-6">
      <header className="flex items-start justify-between gap-3"><h2 id="property-deletion-title" className="text-xl font-semibold">Request property deletion</h2><button type="button" aria-label="Close deletion request" disabled={saving} onClick={onClose} className="rounded-lg p-2 disabled:opacity-50"><X className="h-5 w-5" /></button></header>
      <p className="text-sm text-slate-500">Approval archives this property and blocks access. Reservations, invoices and history are retained, and the PMS platform owner can restore it. It still counts toward your approved property limit.</p>
      {loading ? <p role="status">Loading request form...</p> : null}
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {submitted ? <div role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><p className="font-semibold">Deletion request submitted</p><p className="break-all font-mono">{submitted.request_code}</p><p>Your property remains active until approval.</p><Link href="/property-deletion-requests" className="inline-block font-semibold underline">View deletion requests</Link></div> : context?.pending ? <div className="space-y-3 rounded-xl border border-line p-4 text-sm"><p className="font-semibold">A deletion request is already pending.</p><p className="break-all font-mono">{context.pending.request_code}</p><p>Requested by {context.pending.requested_by} · {date(context.pending.created_at)}</p><p>The PMS platform owner can review this code in Deletion requests.</p><Link href="/property-deletion-requests" className="inline-block font-semibold text-blue-600">View your submitted requests</Link></div> : context ? <form onSubmit={event => void submit(event)} className="space-y-4">
        <p className="break-words font-semibold">{context.property.hotel_name}</p>
        <p className="break-all text-sm text-slate-500">Requested by {context.account.name} · {context.account.email}</p>
        <label className="block text-sm font-semibold">Contact phone<input aria-label="Deletion contact phone" type="tel" required maxLength={30} disabled={saving || stale} value={phone} onChange={event => setPhone(event.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-semibold">Reason<textarea aria-label="Deletion reason" autoFocus required minLength={10} maxLength={1000} rows={3} disabled={saving || stale} value={reason} onChange={event => setReason(event.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-semibold">Type the property name to confirm<input aria-label="Deletion property confirmation" required autoComplete="off" disabled={saving || stale} value={confirmation} onChange={event => setConfirmation(event.target.value)} className={inputClass} /></label>
        <footer className="flex flex-wrap justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-line px-4 py-3 text-sm">Cancel</button><button disabled={saving || stale} className={buttonClass}>{saving ? "Submitting..." : "Submit deletion request"}</button></footer>
      </form> : null}
      {!loading && !submitted && (stale || !context) ? <button type="button" onClick={() => void refresh()} className="text-sm font-semibold text-blue-600">Refresh request form</button> : null}
    </section>
  </div>;
}

export function PropertyDeletionRequestsPage({ review = false }: { review?: boolean }) {
  useColorScheme(); const router = useRouter();
  const [requests, setRequests] = useState<PropertyDeletionRequest[]>([]), [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [allowed, setAllowed] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState(""), [note, setNote] = useState(""), [confirmation, setConfirmation] = useState("");
  const [stale, setStale] = useState(false), generation = useRef(0), lock = useRef(false);
  const refresh = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError("");
    try {
      const result = await listPropertyDeletions(review, status);
      if (current === generation.current) { setRequests(result); setAllowed(true); setSelectedId(""); setNote(""); setConfirmation(""); setStale(false); }
    } catch (failure) { if (current === generation.current) { setError(getApiErrorMessage(failure, "Could not load deletion requests.")); setAllowed(false); setRequests([]); } }
    finally { if (current === generation.current) setLoading(false); }
  }, [review, status]);
  useEffect(() => {
    if (!hasStoredWorkspaceSession() || loadCurrentSessionUser().mode === "demo") { router.replace("/login"); return; }
    void refresh(); return () => { generation.current++; };
  }, [refresh, router]);
  async function save(work: () => Promise<{ message: string }>) {
    if (lock.current || stale || loading) return; lock.current = true; setSaving(true); setError(""); setMessage("");
    try { const result = await work(); await refresh(); setMessage(result.message); }
    catch (failure) { setError(getApiErrorMessage(failure, "The request could not be updated.")); if (isAxiosError(failure) && failure.response?.status === 409) setStale(true); }
    finally { lock.current = false; setSaving(false); }
  }
  const selected = requests.find(request => request._id === selectedId);
  function decide(decision: "approve" | "reject") {
    if (!selected || note.trim().length < 5) { setError("Enter a review note of at least 5 characters."); return; }
    void save(() => reviewPropertyDeletion(selected, { decision, note: note.trim(), confirm_name: confirmation }));
  }
  const disabled = saving || loading || stale;
  return <main className="app-shell-root min-h-screen bg-slate-50 p-4 text-ink sm:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/properties" className="text-sm font-semibold text-blue-600">← Your properties</Link><h1 className="mt-4 text-3xl font-semibold">{review ? "PMS owner portal" : "Property deletion requests"}</h1><p className="mt-2 text-sm text-slate-500">{review ? "Review deletion requests. Approval archives the property with Restore available." : "Track your submitted requests. Properties remain active until approved."}</p></div><button aria-label="Refresh deletion requests" disabled={loading || saving} onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button></header>
    {review && allowed ? <nav aria-label="PMS owner portal" className="flex flex-wrap gap-3"><Link href="/platform/property-requests" className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold">Property requests</Link><Link href="/platform/properties" className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold">All properties</Link><Link href="/platform/property-deletion-requests" aria-current="page" className={buttonClass}>Deletion requests</Link></nav> : null}
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p> : null}
    {stale ? <p className="text-sm text-slate-500">Refresh the list and select the request again to review its latest state.</p> : null}
    {loading ? <p role="status" className="text-sm text-slate-500">Loading deletion requests...</p> : null}
    {review && allowed ? <label className="block max-w-xs text-sm font-semibold">Request status<select aria-label="Deletion request status" disabled={saving} value={status} onChange={event => { setStatus(event.target.value); setMessage(""); setSelectedId(""); }} className={inputClass}>{["pending", "approved", "rejected", "cancelled", "all"].map(value => <option key={value} value={value}>{value === "all" ? "All requests" : statusLabels[value as keyof typeof statusLabels]}</option>)}</select></label> : null}
    {allowed ? <div className={`grid items-start gap-5 ${review ? "lg:grid-cols-2" : ""}`}><section className="space-y-4">
      {requests.map(request => <article key={request._id} className={`min-w-0 space-y-3 rounded-xl border bg-white p-5 ${selectedId === request._id ? "border-blue-500" : "border-line"}`}>
        <p className="break-all font-mono text-sm font-semibold">{request.request_code}</p><h2 className="break-words text-lg font-semibold">{request.property_name}</h2><p className="break-all text-xs text-slate-500">{request.property_id}</p><p className="text-sm font-semibold">{statusLabels[request.status]}</p><p className="text-xs text-slate-500">{date(request.created_at)}</p>
        {review ? <><p className="break-words text-sm text-slate-500">Requested by {request.requested_by.name} · {request.requester_role === "owner" ? "Owner" : "Administrator"}</p><button type="button" disabled={saving || loading} onClick={() => { setSelectedId(request._id); setNote(""); setConfirmation(""); }} className="text-sm font-semibold text-blue-600">Review request</button></> : <>
          <p className="whitespace-pre-wrap break-words text-sm text-slate-500">{request.reason}</p>{request.review_note ? <p className="whitespace-pre-wrap break-words rounded-lg border border-line p-3 text-sm">PMS platform owner: {request.review_note}</p> : null}
          {request.status === "approved" ? <p className="text-sm text-slate-500">Archived when approved. Records were retained. Contact the PMS platform owner to restore access.</p> : null}
          {request.status === "pending" ? <button type="button" disabled={disabled} onClick={() => void save(() => cancelPropertyDeletion(request))} className="text-sm font-semibold text-red-600 disabled:opacity-50">Cancel deletion request</button> : null}
        </>}
      </article>)}{!requests.length && !loading ? <p className="rounded-xl border border-line bg-white p-5 text-sm text-slate-500">No deletion requests {review ? "in this status" : "submitted yet"}.</p> : null}
    </section>{review ? <section>{selected ? <div className="min-w-0 space-y-4 rounded-xl border border-line bg-white p-5"><h2 className="text-xl font-semibold">Review deletion request</h2><p className="break-all font-mono text-sm">{selected.request_code}</p><p className="break-words font-semibold">{selected.current_property?.hotel_name || selected.property_name}</p><p className="break-all text-xs text-slate-500">{selected.property_id}</p>{selected.current_property?.hotel_name !== selected.property_name ? <p className="text-sm text-slate-500">Name when requested: {selected.property_name}</p> : null}<p className="break-words text-sm">Requested by {selected.requested_by.name}</p><p className="break-all text-sm text-slate-500">{selected.requested_by.email} · {selected.contact_phone}</p><p className="whitespace-pre-wrap break-words text-sm">{selected.reason}</p>
      {selected.status === "pending" ? <form onSubmit={event => { event.preventDefault(); decide("approve"); }} className="space-y-4 border-t border-line pt-4"><p className="text-sm text-slate-500">Approval blocks property access and preserves its records. Restore is available in All properties. The property still counts toward the account allowance.</p>
        {!selected.current_property || selected.current_property.status !== "active" ? <p className="text-sm text-red-600">The property is unavailable or already archived. Review its status or reject this request.</p> : <label className="block text-sm font-semibold">Type the current property name to approve<input aria-label="Approve deletion property confirmation" required disabled={disabled} value={confirmation} onChange={event => setConfirmation(event.target.value)} className={inputClass} /></label>}
        <label className="block text-sm font-semibold">Note to requester<textarea aria-label="Deletion review note" required minLength={5} maxLength={1000} rows={3} disabled={disabled} value={note} onChange={event => setNote(event.target.value)} className={inputClass} /></label>
        <div className="flex flex-wrap gap-3"><button disabled={disabled || selected.current_property?.status !== "active"} className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Approve and archive"}</button><button type="button" disabled={disabled} onClick={() => decide("reject")} className="rounded-lg border border-line px-4 py-3 text-sm font-semibold disabled:opacity-50">Reject request</button></div>
      </form> : <p className="whitespace-pre-wrap break-words text-sm text-slate-500">{statusLabels[selected.status]} · {selected.review_note || "This request is closed."}</p>}</div> : <p className="rounded-xl border border-line bg-white p-5 text-sm text-slate-500">Select a request to review its property, contact and reason.</p>}</section> : null}</div> : null}
  </div></main>;
}
