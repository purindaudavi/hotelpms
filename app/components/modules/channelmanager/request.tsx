"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowRight, CircleCheck, Clock3, Plus, RefreshCw, X } from "lucide-react";
import { api, getApiErrorMessage } from "@/app/lib/api";
import { loadCurrentSessionUser } from "@/app/lib/current-user";

type Provider = "Booking.com" | "Agoda" | "Expedia" | "Custom API";
type RequestStatus = "submitted" | "in_review" | "needs_information" | "mapping" | "awaiting_provider_access" | "rejected" | "cancelled";
type HistoryEntry = { event: RequestStatus | "owner_reply"; at: string; note?: string };
type ConnectionRequest = {
  _id: string;
  property_id: string;
  provider: Provider;
  provider_property_id: string;
  contact_name: string;
  contact_email: string;
  notes: string;
  status: RequestStatus;
  history: HistoryEntry[];
  created_at: string;
};
type RequestForm = {
  provider: Provider;
  provider_property_id: string;
  contact_name: string;
  contact_email: string;
  notes: string;
};

const blankForm: RequestForm = {
  provider: "Booking.com",
  provider_property_id: "",
  contact_name: "",
  contact_email: "",
  notes: ""
};

const statusLabel: Record<RequestStatus, string> = {
  submitted: "Submitted",
  in_review: "In review",
  needs_information: "Needs information",
  mapping: "Mapping in progress",
  awaiting_provider_access: "Awaiting provider access",
  rejected: "Rejected",
  cancelled: "Cancelled"
};

function historyLabel(event: HistoryEntry["event"]) {
  return event === "owner_reply" ? "Owner replied" : statusLabel[event];
}

function readableDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function ChannelManagerRequestPage({ propertyId, setToast }: {
  propertyId: string;
  setToast: (message: string) => void;
}) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [form, setForm] = useState<RequestForm>(blankForm);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<{ requests: ConnectionRequest[] }>("/channel-requests", {
        params: { property_id: propertyId }
      });
      setRequests(response.data.requests);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not load channel setup requests."));
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    const session = loadCurrentSessionUser();
    if (session.mode === "demo") {
      setDemo(true);
      setLoading(false);
      return;
    }
    setDemo(false);
    setForm((current) => ({
      ...current,
      contact_name: current.contact_name || session.name,
      contact_email: current.contact_email || session.email
    }));
    void refresh();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await api.post<{ request: ConnectionRequest; review_notification: "sent" | "failed" | "not_configured" }>("/channel-requests", {
        property_id: propertyId,
        ...form
      });
      setRequests((current) => [response.data.request, ...current]);
      setSelectedId(response.data.request._id);
      setShowForm(false);
      setForm((current) => ({ ...blankForm, contact_name: current.contact_name, contact_email: current.contact_email }));
      setToast(response.data.review_notification === "sent"
        ? "Setup request saved and the integration team was emailed. No live channel was connected."
        : "Setup request saved. Email notification was unavailable; the integration team can see it in the review queue.");
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not submit the setup request."));
    } finally {
      setSaving(false);
    }
  }

  async function cancel(request: ConnectionRequest) {
    if (!window.confirm(`Cancel the ${request.provider} setup request?`)) return;
    setError("");
    try {
      const response = await api.post<{ request: ConnectionRequest }>(
        `/channel-requests/${request._id}/cancel`, { property_id: propertyId }
      );
      setRequests((current) => current.map((item) => item._id === request._id ? response.data.request : item));
      setToast("Setup request cancelled.");
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not cancel the setup request."));
    }
  }

  async function sendReply(request: ConnectionRequest) {
    setSaving(true);
    setError("");
    try {
      const response = await api.post<{ request: ConnectionRequest; review_notification: "sent" | "failed" | "not_configured" }>(
        `/channel-requests/${request._id}/reply`, { property_id: propertyId, note: reply }
      );
      setRequests((current) => current.map((item) => item._id === request._id ? response.data.request : item));
      setReply("");
      setToast(response.data.review_notification === "sent"
        ? "Your reply was saved and the integration team was emailed."
        : "Your reply was saved. Email was unavailable; the reviewer can see it in the queue.");
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not send your reply."));
    } finally {
      setSaving(false);
    }
  }

  const selected = requests.find((request) => request._id === selectedId);

  return (
    <main className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Channel Manager</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Connection requests</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Request setup for this hotel and track what has been recorded. This is not a live OTA connection.</p>
        </div>
        <div className="flex gap-2">
          {!demo && <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button>}
          {!demo && <button type="button" onClick={() => { setShowForm((value) => !value); setError(""); }} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />New request</button>}
        </div>
      </div>

      <section className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Setup request only</p>
        <p className="mt-1">Submitting a request stores it for this property and adds it to an internal review queue. Email notification works only if mail settings and a review address are configured. It does not contact the provider, verify credentials, sync rooms, or activate a channel. Do not enter passwords, API keys, or tokens here.</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["1", "Submit details", "Provider, property ID, and setup contact"],
          ["2", "Internal review and mapping", "A reviewer can update the status and leave a note"],
          ["3", "Provider test and activation", "Requires provider API access and a live connector"]
        ].map(([number, title, detail]) => <div key={number} className="rounded-xl border border-line bg-white p-4"><span className="text-xs font-bold text-blue-600">STEP {number}</span><h2 className="mt-2 font-semibold text-ink">{title}</h2><p className="mt-1 text-sm text-slate-500">{detail}</p></div>)}
      </div>

      {demo && <section className="rounded-xl border border-line bg-white p-6 text-sm text-slate-600">Sign in as a property owner to submit and view real setup requests. The demo workspace is read-only.</section>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {showForm && !demo && <form onSubmit={(event) => void submit(event)} className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-ink">New channel setup request</h2><p className="mt-1 text-sm text-slate-500">Property: {propertyId}</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close form" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-ink">Provider *<select required value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as Provider }))} className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 font-normal text-ink"><option>Booking.com</option><option>Agoda</option><option>Expedia</option><option>Custom API</option></select></label>
          <label className="text-sm font-semibold text-ink">Provider property/account ID <span className="font-normal text-slate-500">(if known)</span><input value={form.provider_property_id} maxLength={120} onChange={(event) => setForm((current) => ({ ...current, provider_property_id: event.target.value }))} placeholder="The hotel's ID at this provider" className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 font-normal text-ink" /></label>
          <label className="text-sm font-semibold text-ink">Contact name *<input required value={form.contact_name} maxLength={120} onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 font-normal text-ink" /></label>
          <label className="text-sm font-semibold text-ink">Contact email *<input required type="email" value={form.contact_email} maxLength={254} onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 font-normal text-ink" /></label>
        </div>
        <label className="mt-4 block text-sm font-semibold text-ink">Setup notes <span className="font-normal text-slate-500">(no credentials)</span><textarea value={form.notes} maxLength={2000} rows={3} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Describe the connection you need or any mapping questions." className="mt-2 w-full rounded-lg border border-line bg-white p-3 font-normal text-ink" /></label>
        <div className="mt-5 flex justify-end"><button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Submitting…" : "Submit setup request"}<ArrowRight className="h-4 w-4" /></button></div>
      </form>}

      {!demo && <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-lg font-semibold text-ink">Requests for this hotel</h2><p className="text-sm text-slate-500">Stored in the PMS database, not in this browser.</p></div><span className="text-sm text-slate-500">{requests.length} shown</span></div>
        {loading ? <p className="p-8 text-sm text-slate-500">Loading requests…</p> : requests.length === 0 ? <p className="p-8 text-sm text-slate-500">No setup requests yet. Choose New request to record one.</p> : <div className="divide-y divide-line">{requests.map((request) => <div key={request._id} className="p-5"><button type="button" onClick={() => setSelectedId((current) => current === request._id ? "" : request._id)} className="flex w-full flex-wrap items-center justify-between gap-3 text-left"><div><p className="font-semibold text-ink">{request.provider}</p><p className="mt-1 text-sm text-slate-500">{request.provider_property_id || "Provider ID not supplied"} · Submitted {readableDate(request.created_at)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === "submitted" ? "bg-blue-50 text-blue-700" : request.status === "needs_information" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{statusLabel[request.status]}</span></button>
          {selected?._id === request._id && <div className="mt-5 grid gap-5 border-t border-line pt-5 md:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-600">
              <h3 className="font-semibold text-ink">Details</h3>
              <p>Contact: {request.contact_name} · {request.contact_email}</p>
              <p>Provider ID: {request.provider_property_id || "Not supplied"}</p>
              <p>Notes: {request.notes || "None"}</p>
              {request.status !== "cancelled" && request.status !== "rejected" && <button type="button" onClick={() => void cancel(request)} className="mt-2 text-sm font-semibold text-rose-600 hover:underline">Cancel request</button>}
              {request.status === "needs_information" && <div className="mt-5 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <label className="block font-semibold text-ink">Reply to the reviewer<textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} maxLength={1000} placeholder="Answer the question in the history. Do not include passwords or API keys." className="mt-2 w-full rounded-lg border border-line bg-white p-3 font-normal text-ink" /></label>
                <button type="button" onClick={() => void sendReply(request)} disabled={saving || reply.trim().length < 10} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Sending…" : "Send reply"}</button>
              </div>}
            </div>
            <div><h3 className="text-sm font-semibold text-ink">History</h3><ol className="mt-3 space-y-3">{request.history.map((entry, index) => <li key={`${entry.event}-${index}`} className="flex items-start gap-3 text-sm text-slate-600">{entry.event === "submitted" ? <CircleCheck className="mt-0.5 h-4 w-4 text-blue-600" /> : <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" />}<span>{historyLabel(entry.event)} <span className="text-slate-400">· {readableDate(entry.at)}</span>{entry.note && <span className="mt-1 block whitespace-pre-wrap">{entry.note}</span>}</span></li>)}</ol></div>
          </div>}
        </div>)}</div>}
      </section>}
    </main>
  );
}
