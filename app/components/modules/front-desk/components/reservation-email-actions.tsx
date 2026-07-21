"use client";

import { useState } from "react";
import type { Reservation } from "@/app/data/pms-data";
import { isValidEmail } from "@/app/lib/reservation-email";

type Props = {
  booking: Reservation;
  onReminder: () => Promise<boolean>;
  onGeneral: (to: string, subject: string, message: string) => Promise<boolean>;
};

export function ReservationEmailActions({ booking, onReminder, onGeneral }: Props) {
  const [generalOpen, setGeneralOpen] = useState(false);
  const [to, setTo] = useState(booking.email === "-" ? "" : booking.email);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const generalValid = isValidEmail(to) && Boolean(subject.trim()) && Boolean(message.trim());

  async function sendReminder() {
    if (sending) return;
    setSending(true);
    try { await onReminder(); } finally { setSending(false); }
  }

  async function sendGeneral() {
    if (sending || !generalValid) return;
    setSending(true);
    try {
      if (await onGeneral(to.trim(), subject.trim(), message.trim())) {
        setGeneralOpen(false);
        setSubject("");
        setMessage("");
      }
    } finally {
      setSending(false);
    }
  }

  return <>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={sending} onClick={() => void sendReminder()} className="rounded-md border border-line px-3 py-2 text-xs font-semibold disabled:opacity-50">
        {sending ? "Sending…" : "Send reminder email"}
      </button>
      <button type="button" disabled={sending} onClick={() => setGeneralOpen(true)} className="rounded-md border border-line px-3 py-2 text-xs font-semibold disabled:opacity-50">
        Send general email
      </button>
    </div>

    {generalOpen ? <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4">
      <section className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold">Send general email</h3>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">Recipient<input type="email" value={to} onChange={(event) => setTo(event.target.value)} className="h-11 rounded-md border border-line px-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} className="h-11 rounded-md border border-line px-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold">Message<textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} className="rounded-md border border-line px-3 py-2 font-normal" /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={sending} onClick={() => setGeneralOpen(false)} className="h-11 rounded-md border border-line px-4 font-semibold">Cancel</button>
          <button type="button" disabled={sending || !generalValid} onClick={() => void sendGeneral()} className="h-11 rounded-md bg-ink px-5 font-semibold text-white disabled:opacity-50">{sending ? "Sending…" : "Send email"}</button>
        </div>
      </section>
    </div> : null}
  </>;
}
