"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { api, getApiErrorMessage } from "@/app/lib/api";
import { loadCurrentSessionUser } from "@/app/lib/current-user";

type ReviewStatus = "submitted" | "in_review" | "needs_information" | "mapping" | "awaiting_provider_access" | "rejected" | "cancelled";
type ReviewRequest = {
  _id: string;
  property_id: string;
  provider: string;
  provider_property_id: string;
  contact_name: string;
  contact_email: string;
  notes: string;
  status: ReviewStatus;
  created_at: string;
  history: { event: ReviewStatus | "owner_reply"; at: string; note?: string }[];
};

const reviewOptions: { value: Exclude<ReviewStatus, "submitted" | "cancelled">; label: string }[] = [
  { value: "in_review", label: "In review" },
  { value: "needs_information", label: "Needs information" },
  { value: "mapping", label: "Mapping in progress" },
  { value: "awaiting_provider_access", label: "Awaiting provider access" },
  { value: "rejected", label: "Rejected" }
];

function label(value: ReviewStatus | "owner_reply") {
  if (value === "owner_reply") return "Owner replied";
  return reviewOptions.find((option) => option.value === value)?.label ||
    (value === "submitted" ? "Submitted" : "Cancelled");
}

function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

export default function IntegrationReviewPage() {
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [nextStatus, setNextStatus] = useState<(typeof reviewOptions)[number]["value"]>("in_review");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<{ requests: ReviewRequest[] }>("/internal/channel-requests");
      setRequests(response.data.requests);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not load the review queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const role = loadCurrentSessionUser().role;
    const reviewer = role === "admin" || role === "developer" || role === "integration_reviewer";
    setAllowed(reviewer);
    if (reviewer) void refresh();
    else setLoading(false);
  }, [refresh]);

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await api.patch<{ request: ReviewRequest; contact_notification: "sent" | "failed" | "not_configured" }>(
        `/internal/channel-requests/${selectedId}/status`, { status: nextStatus, note }
      );
      setRequests((current) => current.map((item) => item._id === selectedId ? response.data.request : item));
      setNote("");
      setMessage(response.data.contact_notification === "sent"
        ? "Status saved and the hotel contact was emailed."
        : "Status saved. Email was unavailable; the hotel owner can see the update in Request.");
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not update the request."));
    } finally {
      setSaving(false);
    }
  }

  const selected = requests.find((request) => request._id === selectedId);

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><Link href="/properties" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft className="h-4 w-4" />Your properties</Link><h1 className="mt-4 text-3xl font-bold">Integration review queue</h1><p className="mt-2 text-sm text-slate-600">Internal setup review only. No status on this page activates a provider connection.</p></div>
        {allowed && <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button>}
      </div>
      {!allowed && <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">Sign in with an authorized integration reviewer account to review setup requests. Hotel owners can view their own requests under Channel Manager → Request.</section>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}

      {allowed && <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5"><h2 className="text-lg font-semibold">Requests</h2><p className="text-sm text-slate-500">{requests.length} most recent requests</p></div>
          {loading ? <p className="p-6 text-sm text-slate-500">Loading…</p> : requests.length === 0 ? <p className="p-6 text-sm text-slate-500">No requests yet.</p> : <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">{requests.map((request) => <button key={request._id} type="button" onClick={() => { setSelectedId(request._id); setMessage(""); }} className={`w-full p-5 text-left hover:bg-blue-50 ${selectedId === request._id ? "bg-blue-50" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{request.provider}</p><p className="mt-1 text-sm text-slate-600">{request.property_id}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{label(request.status)}</span></div><p className="mt-2 text-xs text-slate-500">{dateTime(request.created_at)}</p></button>)}</div>}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          {!selected ? <p className="text-sm text-slate-500">Select a request to inspect its history and update its setup status.</p> : <div className="space-y-5">
            <div><h2 className="text-xl font-semibold">{selected.provider} · {selected.property_id}</h2><p className="mt-1 text-sm text-slate-600">Current status: {label(selected.status)}</p></div>
            <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2"><p><strong>Provider property ID</strong><br />{selected.provider_property_id || "Not supplied"}</p><p><strong>Setup contact</strong><br />{selected.contact_name}<br />{selected.contact_email}</p><p className="sm:col-span-2"><strong>Owner notes</strong><br />{selected.notes || "None"}</p></div>
            <div><h3 className="font-semibold">History</h3><ol className="mt-2 space-y-3">{selected.history.map((entry, index) => <li key={`${entry.event}-${index}`} className="border-l-2 border-blue-200 pl-3 text-sm"><p className="font-medium">{label(entry.event)} <span className="font-normal text-slate-500">· {dateTime(entry.at)}</span></p>{entry.note && <p className="mt-1 whitespace-pre-wrap text-slate-600">{entry.note}</p>}</li>)}</ol></div>
            {selected.status === "cancelled" || selected.status === "rejected" ? <p className="rounded-lg bg-slate-100 p-3 text-sm">This request is closed. The hotel owner must submit a new request.</p> : <form onSubmit={(event) => void updateStatus(event)} className="space-y-3 border-t border-slate-200 pt-5"><h3 className="font-semibold">Update setup status</h3><label className="block text-sm font-medium">Next status<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as typeof nextStatus)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2.5">{reviewOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="block text-sm font-medium">Note to hotel owner<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} placeholder="Explain what was reviewed or what information is needed." className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5" /></label><p className="text-xs text-slate-500">The status and note are saved in the owner-visible history. Email requires configured SMTP. Live testing and activation are not available here.</p><button disabled={saving || nextStatus === selected.status} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save status"}</button></form>}
          </div>}
        </section>
      </div>}
    </div>
  </main>;
}
