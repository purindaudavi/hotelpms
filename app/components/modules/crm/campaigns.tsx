"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Mail, Send, X, XCircle } from "lucide-react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { type Reservation } from "@/app/data/pms-data";
import {
  crmCampaignLogsKey,
  crmTemplatesKey,
  isPromoTemplate,
  type CrmCampaignLog,
  type CrmTemplate
} from "@/app/components/modules/crm/crm-session";

type CampaignsPageProps = {
  propertyId: string;
  reservations: Reservation[];
  setToast: (message: string) => void;
};

type CampaignTab = "templates" | "client-emails";

type GuestProfile = {
  id: string;
  name: string;
  initials: string;
  city: string;
  country: string;
  phone: string;
  email: string;
};

export function CampaignsPage({ propertyId, reservations, setToast }: CampaignsPageProps) {
  const [templates] = useSessionState<CrmTemplate[]>(crmTemplatesKey(propertyId), []);
  const [logs, setLogs] = useSessionState<CrmCampaignLog[]>(crmCampaignLogsKey(propertyId), []);
  const [activeTab, setActiveTab] = useState<CampaignTab>("templates");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("HotelMate | Promo Campaign");
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);

  const promoTemplates = useMemo(() => templates.filter(isPromoTemplate), [templates]);
  const selectedTemplate = useMemo(() => promoTemplates.find((template) => template.id === selectedTemplateId), [promoTemplates, selectedTemplateId]);
  const guests = useMemo(() => buildGuestProfiles(reservations), [reservations]);

  useEffect(() => {
    if (!selectedTemplateId && promoTemplates[0]) {
      setSelectedTemplateId(promoTemplates[0].id);
      setSubject(promoTemplates[0].subject);
    }
  }, [promoTemplates, selectedTemplateId]);

  useEffect(() => {
    if (selectedTemplate) setSubject(selectedTemplate.subject);
  }, [selectedTemplate]);

  function toggleGuest(guestId: string) {
    setSelectedGuestIds((current) => (current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId]));
  }

  function sendToGuests(targetGuests: GuestProfile[]) {
    if (!selectedTemplate) {
      setActiveTab("templates");
      setToast("Please select a template first");
      return;
    }
    if (!targetGuests.length) {
      setToast("Select at least one guest");
      return;
    }

    const sentAt = new Date().toISOString();
    const nextLogs = targetGuests.map((guest, index) => {
      const validEmail = isValidEmail(guest.email);
      return {
        id: `campaign-log-${Date.now()}-${index}`,
        sentAt,
        guestName: guest.name,
        email: guest.email,
        templateName: selectedTemplate.templateName,
        subject,
        status: validEmail ? "Successful" : "Failed",
        message: validEmail ? "Email queued for delivery" : "Missing or invalid email address"
      } satisfies CrmCampaignLog;
    });

    setLogs((current) => [...nextLogs, ...current]);
    setSelectedGuestIds([]);
    const successful = nextLogs.filter((log) => log.status === "Successful").length;
    const failed = nextLogs.length - successful;
    setToast(`${successful} successful, ${failed} failed`);
  }

  const selectedGuests = guests.filter((guest) => selectedGuestIds.includes(guest.id));

  return (
    <main className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold">Promo Promotions</h2>
          <p className="mt-1 text-slate-500">Create and manage promotional campaigns for your hotel.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-cyan-50 text-slate-800">
            <Mail className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={() => setLogsOpen(true)}
            className="inline-flex h-12 items-center gap-2 rounded-md border border-line bg-white px-5 text-sm font-semibold hover:bg-slate-50"
          >
            <FileText className="h-5 w-5" />
            Logs
          </button>
        </div>
      </div>

      <div className="grid rounded-lg bg-slate-100 p-1 md:grid-cols-2">
        <TabButton active={activeTab === "templates"} onClick={() => setActiveTab("templates")}>
          Templates
        </TabButton>
        <TabButton active={activeTab === "client-emails"} onClick={() => setActiveTab("client-emails")}>
          Client Emails
        </TabButton>
      </div>

      {activeTab === "templates" ? (
        <TemplateCampaignTab
          promoTemplates={promoTemplates}
          selectedTemplate={selectedTemplate}
          selectedTemplateId={selectedTemplateId}
          setSelectedTemplateId={setSelectedTemplateId}
          subject={subject}
          setSubject={setSubject}
        />
      ) : (
        <ClientEmailsTab
          guests={guests}
          selectedTemplate={selectedTemplate}
          selectedGuestIds={selectedGuestIds}
          selectedGuests={selectedGuests}
          toggleGuest={toggleGuest}
          sendToGuests={sendToGuests}
        />
      )}

      {logsOpen ? <CampaignLogsDrawer logs={logs} onClose={() => setLogsOpen(false)} /> : null}
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded-md text-sm font-semibold transition ${active ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
    >
      {children}
    </button>
  );
}

function TemplateCampaignTab({
  promoTemplates,
  selectedTemplate,
  selectedTemplateId,
  setSelectedTemplateId,
  subject,
  setSubject
}: {
  promoTemplates: CrmTemplate[];
  selectedTemplate?: CrmTemplate;
  selectedTemplateId: string;
  setSelectedTemplateId: (value: string) => void;
  subject: string;
  setSubject: (value: string) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[280px_1fr_0.95fr]">
      <div className="text-slate-500">
        {promoTemplates.length ? (
          <div className="space-y-2">
            {promoTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={`w-full rounded-md border px-4 py-3 text-left text-sm font-semibold ${
                  selectedTemplateId === template.id ? "border-ink bg-ink text-white" : "border-line bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="block">{template.templateName}</span>
                <span className="mt-1 block text-xs opacity-75">{template.promoCode}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-lg leading-7">
            No templates found for 'promo'.
            <br />
            Create one in Templates or choose a different category.
          </p>
        )}
      </div>

      <div className="space-y-5">
        <Field label="Select Promo Code">
          <select
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
          >
            <option value="">Choose a promo code</option>
            {promoTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.promoCode}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Email Subject">
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="focus-ring h-14 w-full rounded-md border border-line bg-white px-4 text-lg"
          />
        </Field>
      </div>

      <section className="min-h-56 rounded-lg border border-line bg-white">
        <div className="border-b border-line bg-slate-50 px-5 py-4">
          <h3 className="font-semibold">Email Preview</h3>
        </div>
        {selectedTemplate ? (
          <div className="space-y-4 p-5">
            {selectedTemplate.images.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedTemplate.images.map((image) => (
                  <img key={image.id} src={image.dataUrl} alt={image.name} className="h-28 w-full rounded-md object-cover" />
                ))}
              </div>
            ) : null}
            <p className="text-sm font-semibold">{subject}</p>
            <div className="whitespace-pre-line text-sm leading-6 text-slate-600">{selectedTemplate.body.replaceAll("{{guestName}}", "ASIRI NIRMAL PERERA")}</div>
          </div>
        ) : (
          <div className="grid min-h-40 place-items-center px-5 text-center text-slate-500">Select a template on the left to preview it here.</div>
        )}
      </section>
    </section>
  );
}

function ClientEmailsTab({
  guests,
  selectedTemplate,
  selectedGuestIds,
  selectedGuests,
  toggleGuest,
  sendToGuests
}: {
  guests: GuestProfile[];
  selectedTemplate?: CrmTemplate;
  selectedGuestIds: string[];
  selectedGuests: GuestProfile[];
  toggleGuest: (guestId: string) => void;
  sendToGuests: (guests: GuestProfile[]) => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-7 shadow-sm">
      <div>
        <h3 className="text-3xl font-semibold">Send Promotional Emails</h3>
        <p className="mt-1 text-slate-500">Select guests and send your promotional email campaign.</p>
        {!selectedTemplate ? <p className="mt-3 text-sm font-semibold text-amber-700">Please select a template first in the Templates tab before sending emails.</p> : null}
      </div>

      <section className="mt-8 overflow-hidden rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h4 className="text-lg font-semibold">Guest Profiles ({guests.length})</h4>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selectedTemplate || !guests.length}
              onClick={() => sendToGuests(guests)}
              className="inline-flex h-10 items-center rounded-md bg-slate-500 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send All
            </button>
            <button
              type="button"
              disabled={!selectedTemplate || !selectedGuests.length}
              onClick={() => sendToGuests(selectedGuests)}
              className="inline-flex h-10 items-center rounded-md bg-slate-500 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send to Selected
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-slate-700">
                {["Guest Name", "City", "Country", "Phone", "Email", "", ""].map((heading, index) => (
                  <th key={`${heading}-${index}`} className="px-5 py-4 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-xs font-semibold">{guest.initials}</span>
                      <span className="font-semibold">{guest.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">{guest.city}</td>
                  <td className="px-5 py-4">{guest.country}</td>
                  <td className="px-5 py-4">{guest.phone}</td>
                  <td className="px-5 py-4">{guest.email}</td>
                  <td className="px-5 py-4 text-right">
                    <input type="checkbox" checked={selectedGuestIds.includes(guest.id)} onChange={() => toggleGuest(guest.id)} />
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      disabled={!selectedTemplate}
                      onClick={() => sendToGuests([guest])}
                      className="inline-flex h-10 items-center rounded-md bg-slate-500 px-5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Send
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function CampaignLogsDrawer({ logs, onClose }: { logs: CrmCampaignLog[]; onClose: () => void }) {
  const total = logs.length;
  const successful = logs.filter((log) => log.status === "Successful").length;
  const failed = logs.filter((log) => log.status === "Failed").length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <aside className="flex h-full w-full max-w-3xl flex-col rounded-l-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-8 py-7">
          <div className="flex items-start gap-4">
            <Mail className="mt-2 h-7 w-7 text-blue-600" />
            <div>
              <h3 className="text-2xl font-semibold">Birthday Email Logs</h3>
              <p className="text-slate-500">View all sent birthday emails</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close logs" className="rounded-md border border-line p-1 text-slate-500 hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 border-y border-line bg-slate-50 px-8 py-7 text-center">
          <LogMetric value={total} label="Total Sent" className="text-blue-600" />
          <LogMetric value={successful} label="Successful" className="text-emerald-600" />
          <LogMetric value={failed} label="Failed" className="text-rose-600" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          {logs.length ? (
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-slate-50 text-slate-600">
                    {["Time", "Guest", "Email", "Template", "Status", "Message"].map((heading) => (
                      <th key={heading} className="px-4 py-3 font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">{formatLogTime(log.sentAt)}</td>
                      <td className="px-4 py-3 font-semibold">{log.guestName}</td>
                      <td className="px-4 py-3">{log.email}</td>
                      <td className="px-4 py-3">{log.templateName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                            log.status === "Successful" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {log.status === "Successful" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center text-center text-slate-500">
              <div>
                <Mail className="mx-auto mb-6 h-16 w-16 text-slate-300" />
                <p className="text-xl">No birthday emails sent yet</p>
                <p className="mt-4 text-sm">Logs will appear here when the cron job sends birthday emails</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line px-8 py-5 text-center text-sm text-slate-500">
          Logs are automatically generated when birthday emails are sent via the cron job
        </div>
      </aside>
    </div>
  );
}

function LogMetric({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div>
      <p className={`text-3xl font-semibold ${className}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
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

function buildGuestProfiles(reservations: Reservation[]) {
  const seen = new Set<string>();
  return reservations
    .map((reservation) => ({
      id: reservation.id,
      name: reservation.guest,
      initials: buildInitials(reservation.guest),
      city: "-",
      country: reservation.country || "-",
      phone: reservation.phone || "-",
      email: reservation.email || "-"
    }))
    .filter((guest) => {
      const key = `${guest.name}:${guest.email}:${guest.phone}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatLogTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
