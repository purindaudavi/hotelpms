"use client";

import { type DragEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, GripVertical, Mail, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  activateEmailTemplate,
  createEmailTemplate,
  getEmailTemplates,
  getEmailTemplatesApiErrorMessage,
  setUseDefaultEmailTemplates,
  updateEmailTemplate,
  type EmailTemplateCategory
} from "@/app/lib/email-templates-api";

const categories = ["Confirmation", "Check-in", "Check-out", "Cancellation", "Reminder", "No-show", "General"] as const;
type Category = (typeof categories)[number];
type BlockKind = "header" | "reservation" | "custom" | "footer";
type TemplateBlock = { id: string; kind: BlockKind; title: string; content: string };
type EmailTemplate = {
  id: string;
  category: Category;
  name: string;
  subject: string;
  blocks: TemplateBlock[];
  active: boolean;
  updatedAt: string | null;
};

const categoryKeys: Record<Category, EmailTemplateCategory> = {
  Confirmation: "confirmation",
  "Check-in": "check-in",
  "Check-out": "check-out",
  Cancellation: "cancellation",
  Reminder: "reminder",
  "No-show": "no-show",
  General: "general"
};
const categoryLabels = Object.fromEntries(Object.entries(categoryKeys).map(([label, key]) => [key, label])) as Record<EmailTemplateCategory, Category>;

const placeholders = [
  ["Guest Name", "{{guestName}}"], ["Hotel Name", "{{hotelName}}"], ["Hotel Phone", "{{hotelPhone}}"],
  ["Reservation No", "{{reservationNo}}"], ["Booking Source", "{{bookingSource}}"], ["Payment", "{{payment}}"],
  ["Check-in Date", "{{checkInDate}}"], ["Check-out Date", "{{checkOutDate}}"], ["Nights", "{{nights}}"],
  ["Rooms", "{{roomsCount}}"], ["Total Amount", "{{totalAmount}}"], ["Currency", "{{currency}}"],
  ["Guest Email", "{{guestEmail}}"], ["Guest Country", "{{guestCountry}}"], ["Special Requests", "{{specialRequests}}"],
  ["Time & Location", "{{timeLocation}}"], ["Wi-Fi Name", "{{wifiName}}"], ["Wi-Fi Password", "{{wifiPassword}}"],
  ["General Subject", "{{subject}}"], ["General Message", "{{message}}"]
] as const;

const sample: Record<string, string> = {
  guestName: "John Smith", hotelName: "Ronaka Airport Transit Hotel", hotelPhone: "+94 70 355 1340",
  reservationNo: "HM-24018", bookingSource: "Direct", payment: "Paid", checkInDate: "Monday, June 15 2026",
  checkOutDate: "Wednesday, June 17 2026", nights: "2 nights", roomsCount: "Deluxe Double - Room 101",
  totalAmount: "52,000.00", currency: "LKR", guestEmail: "john@example.com", guestCountry: "United Kingdom",
  specialRequests: "Late check-in", subject: "Information about your stay", message: "We look forward to welcoming you.",
  timeLocation: "2:00 PM - Front Desk", wifiName: "StayPilot Guest", wifiPassword: "Provided at check-in"
};

const blockLibrary: Array<{ label: string; kind: BlockKind; content: string }> = [
  { label: "Header", kind: "header", content: "Dear {{guestName}},\n\nA message from {{hotelName}}." },
  { label: "Reservation details", kind: "reservation", content: "Reservation: {{reservationNo}}\nCheck-in: {{checkInDate}}\nCheck-out: {{checkOutDate}}\nRooms: {{roomsCount}}\nPayment: {{payment}}" },
  { label: "Custom message", kind: "custom", content: "Write your custom message here." },
  { label: "Footer", kind: "footer", content: "Kind regards,\n{{hotelName}}\n{{hotelPhone}}" }
];

export function SettingsTemplatesPage({ propertyId, setToast }: { propertyId: string; setToast: (message: string) => void }) {
  const [category, setCategory] = useState<Category>("Confirmation");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [defaults, setDefaults] = useState<EmailTemplate[]>([]);
  const [useDefaults, setUseDefaults] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void getEmailTemplates(propertyId)
      .then((response) => {
        if (cancelled) return;
        setTemplates(response.templates.map(fromApiTemplate));
        setDefaults(response.defaults.map(fromApiTemplate));
        setUseDefaults(response.settings.useDefaultTemplates);
      })
      .catch((loadError) => { if (!cancelled) setError(getEmailTemplatesApiErrorMessage(loadError)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [propertyId]);

  const categoryTemplates = templates.filter((template) => template.category === category);
  const defaultTemplate = defaults.find((template) => template.category === category);

  async function saveTemplate(template: EmailTemplate) {
    setSaving(true);
    setError("");
    try {
      const payload = { category: categoryKeys[template.category], name: template.name, subject: template.subject, blocks: template.blocks };
      const saved = template.id
        ? await updateEmailTemplate(propertyId, template.id, payload)
        : await createEmailTemplate(propertyId, payload);
      const next = fromApiTemplate(saved);
      setTemplates((items) => items.some((item) => item.id === next.id)
        ? items.map((item) => item.id === next.id ? next : item)
        : [...items, next]);
      setCategory(next.category);
      setEditing(null);
      setToast("Email template saved in MongoDB");
    } catch (saveError) {
      setError(getEmailTemplatesApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleDefaults(checked: boolean) {
    const previous = useDefaults;
    setUseDefaults(checked);
    setError("");
    try {
      const settings = await setUseDefaultEmailTemplates(propertyId, checked);
      setUseDefaults(settings.useDefaultTemplates);
      setToast(settings.useDefaultTemplates ? "Built-in email templates are now used" : "Custom email templates can now be selected");
    } catch (settingsError) {
      setUseDefaults(previous);
      setError(getEmailTemplatesApiErrorMessage(settingsError));
    }
  }

  async function useTemplate(template: EmailTemplate) {
    setSaving(true);
    setError("");
    try {
      const active = fromApiTemplate(await activateEmailTemplate(propertyId, template.id));
      setTemplates((items) => items.map((item) => item.category === active.category ? { ...item, active: item.id === active.id } : item));
      setToast(`${active.name} will now be used for ${active.category} emails`);
    } catch (activateError) {
      setError(getEmailTemplatesApiErrorMessage(activateError));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return <TemplateBuilder initial={editing === "new" ? null : editing} initialCategory={category} defaults={defaults} saving={saving} onCancel={() => setEditing(null)} onSave={saveTemplate} />;
  }

  return <main className="p-4 lg:p-6">
    <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
      <aside className="border-r border-line pr-4">
        <h2 className="mb-3 font-semibold text-slate-500">Email Category</h2>
        <nav className="space-y-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-semibold ${category === item ? "template-category-selected bg-ink text-white" : "hover:bg-slate-100"}`}><Mail className="h-4 w-4" />{item}</button>)}</nav>
      </aside>
      <section className="min-w-0">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Templates: {category}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex h-11 cursor-pointer items-center gap-3 rounded-md border border-line bg-white px-4 text-sm font-semibold">
              <input type="checkbox" checked={useDefaults} disabled={loading || saving} onChange={(event) => void toggleDefaults(event.target.checked)} className="h-5 w-5 rounded accent-ink" />
              Use default email templates
            </label>
            <button onClick={() => setEditing("new")} disabled={loading || !defaultTemplate} className="template-create-button inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Create Template</button>
          </div>
        </header>
        {error ? <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
        {loading ? <div className="grid min-h-52 place-items-center rounded-lg border border-line"><RefreshCw className="h-6 w-6 animate-spin text-slate-400" /></div> : null}
        {!loading && defaultTemplate ? <DefaultPreview template={defaultTemplate} active={useDefaults} /> : null}
        {!loading ? <section className={`mt-5 transition ${useDefaults ? "pointer-events-none select-none opacity-40 grayscale" : ""}`} aria-disabled={useDefaults}>
          {useDefaults ? <p className="mb-3 rounded-md bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">Custom templates are disabled while the default-template option is selected.</p> : null}
          {categoryTemplates.length ? <div className="grid gap-4 md:grid-cols-2">{categoryTemplates.map((template) => <TemplateCard key={template.id} template={template} saving={saving} onUse={() => void useTemplate(template)} onEdit={() => setEditing(template)} />)}</div> : <p className="rounded-lg border border-dashed border-line p-8 text-center text-slate-500">No custom template in this category yet. Create one from the current default, then select it when you are ready to use it.</p>}
        </section> : null}
      </section>
    </div>
  </main>;
}

function TemplateCard({ template, saving, onUse, onEdit }: { template: EmailTemplate; saving: boolean; onUse: () => void; onEdit: () => void }) {
  return <article className={`rounded-lg border p-5 ${template.active ? "border-emerald-400 bg-emerald-50/40" : "border-line"}`}>
    <div className="flex justify-between gap-3">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{template.name}</h3>{template.active ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"><Check className="h-3 w-3" />In use</span> : null}</div><p className="mt-1 text-sm text-slate-500">{template.blocks.length} blocks · Updated {template.updatedAt ? new Date(template.updatedAt).toLocaleString() : "just now"}</p><p className="mt-2 truncate text-xs text-slate-500">Subject: {template.subject}</p></div>
      <div className="flex shrink-0 flex-col gap-2"><button onClick={onUse} disabled={template.active || saving} className={`h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:bg-slate-300 ${template.active ? "template-selected-button" : ""}`}>{template.active ? "Selected" : "Use template"}</button><button onClick={onEdit} className="h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold">View / Edit</button></div>
    </div>
  </article>;
}

function DefaultPreview({ template, active }: { template: EmailTemplate; active: boolean }) {
  return <article className={`rounded-lg border p-5 ${active ? "border-emerald-400 bg-emerald-50/30" : "border-line"}`}>
    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">Default {template.category.toLowerCase()} email</h3>{active ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"><Check className="h-3 w-3" />Currently used</span> : null}</div>
    <p className="mt-2 text-sm text-slate-500">This is the original backend email. New custom templates begin as a copy of this format.</p>
    <p className="mt-2 text-sm text-slate-500">Subject: {template.subject}</p>
    <div className="mt-4 max-h-[550px] overflow-y-auto rounded-lg bg-slate-100 p-6"><EmailPreview blocks={template.blocks} category={template.category} /></div>
  </article>;
}

function TemplateBuilder({ initial, initialCategory, defaults, saving, onCancel, onSave }: {
  initial: EmailTemplate | null;
  initialCategory: Category;
  defaults: EmailTemplate[];
  saving: boolean;
  onCancel: () => void;
  onSave: (template: EmailTemplate) => Promise<void>;
}) {
  const selectedDefault = defaults.find((template) => template.category === initialCategory);
  const [category, setCategory] = useState(initial?.category ?? initialCategory);
  const [name, setName] = useState(initial?.name ?? `${initialCategory} custom`);
  const [subject, setSubject] = useState(initial?.subject ?? selectedDefault?.subject ?? initialCategory);
  const [blocks, setBlocks] = useState<TemplateBlock[]>(() => cloneBlocks(initial?.blocks ?? selectedDefault?.blocks ?? []));
  const [focused, setFocused] = useState<string | null>(blocks[0]?.id ?? null);
  const rendered = useMemo(() => blocks, [blocks]);

  function loadCategoryDefault(nextCategory: Category) {
    const nextDefault = defaults.find((template) => template.category === nextCategory);
    setCategory(nextCategory);
    if (!initial) {
      setName(`${nextCategory} custom`);
      setSubject(nextDefault?.subject ?? nextCategory);
      const nextBlocks = cloneBlocks(nextDefault?.blocks ?? []);
      setBlocks(nextBlocks);
      setFocused(nextBlocks[0]?.id ?? null);
    }
  }
  function addBlock(kind: BlockKind, title: string, content: string) { const block = { id: createBlockId(), kind, title, content }; setBlocks((items) => [...items, block]); setFocused(block.id); }
  function insertPlaceholder(token: string) { if (!focused) return; setBlocks((items) => items.map((block) => block.id === focused ? { ...block, content: `${block.content}${block.content && !block.content.endsWith(" ") ? " " : ""}${token}` } : block)); }
  function drop(event: DragEvent) { event.preventDefault(); try { const data = JSON.parse(event.dataTransfer.getData("text/plain")); if (data.type === "block") addBlock(data.kind, data.label, data.content); if (data.type === "placeholder") insertPlaceholder(data.token); } catch { /* Ignore files and external text. */ } }
  function move(index: number, direction: -1 | 1) { const next = [...blocks]; const target = index + direction; if (target < 0 || target >= next.length) return;[next[index], next[target]] = [next[target], next[index]]; setBlocks(next); }

  return <main className="p-4"><header className="mb-4 flex items-center justify-between border-b border-line pb-4"><button onClick={onCancel} className="inline-flex items-center gap-2 font-semibold"><ArrowLeft className="h-4 w-4" />Back to templates</button><h1 className="text-xl font-semibold">{initial ? "Edit email template" : "Create email template"}</h1><span /></header><div className="grid min-h-[760px] gap-3 xl:grid-cols-[280px_1fr_1fr]">
    <BlockLibrary addBlock={addBlock} insertPlaceholder={insertPlaceholder} />
    <section className="flex min-h-0 flex-col rounded-lg border border-line">
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-semibold">Category</span>
          <select value={category} disabled={Boolean(initial)} onChange={
            (event) => loadCategoryDefault(event.target.value as Category)}
            className="h-11 w-full rounded-md border border-line bg-white px-3 disabled:bg-slate-100">
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">Template name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-md border border-line px-3" />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold">Email subject</span>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} className="h-11 w-full rounded-md border border-line px-3" />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button onClick={() => { const source = defaults.find((template) => template.category === category); setSubject(source?.subject ?? category); setBlocks(cloneBlocks(source?.blocks ?? [])); }} className="rounded-md border border-line px-4 py-2 font-semibold">Reload original default</button>
          <button onClick={() => setBlocks([])} className="px-4 py-2 font-semibold">Start from scratch</button>
        </div>
      </div>
      <p className="border-b border-line px-4 py-3 text-sm text-slate-500">Drag blocks from the left, reorder them, and edit their text.</p><div onDragOver={(event) => event.preventDefault()} onDrop={drop} className="min-h-96 flex-1 space-y-3 overflow-y-auto border-2 border-dashed border-slate-200 p-3">{blocks.length ? blocks.map((block, index) => <article key={block.id} onClick={() => setFocused(block.id)} className={`rounded-lg border bg-white ${focused === block.id ? "border-ocean ring-2 ring-ocean/10" : "border-line"}`}><header className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm"><GripVertical className="h-4 w-4 text-slate-400" /><strong className="flex-1">{block.title}</strong><button onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></button><button onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></button><button onClick={() => setBlocks((items) => items.filter((item) => item.id !== block.id))} className="text-rose-500"><Trash2 className="h-4 w-4" /></button></header><input value={block.title} onChange={(event) => setBlocks((items) => items.map((item) => item.id === block.id ? { ...item, title: event.target.value } : item))} className="mx-3 mt-3 h-9 w-[calc(100%-1.5rem)] rounded border border-line px-2 text-sm font-semibold" /><textarea value={block.content} onFocus={() => setFocused(block.id)} onChange={(event) => setBlocks((items) => items.map((item) => item.id === block.id ? { ...item, content: event.target.value } : item))} className="min-h-28 w-full resize-y p-3 text-sm outline-none" /></article>) : <div className="grid h-80 place-items-center text-center text-slate-400">Drop email blocks here</div>}</div><footer className="flex justify-end gap-3 border-t border-line p-4"><button onClick={onCancel} className="h-11 rounded-md border border-line px-5 font-semibold">Cancel</button><button disabled={saving || !name.trim() || !subject.trim() || !blocks.length} onClick={() => void onSave({ id: initial?.id ?? "", category, name: name.trim(), subject: subject.trim(), blocks, active: initial?.active ?? false, updatedAt: initial?.updatedAt ?? null })} className="h-11 rounded-md bg-ink px-5 font-semibold text-white disabled:opacity-40">{saving ? "Saving..." : "Save template"}</button></footer></section>
    <section className="min-w-0 rounded-lg border border-line"><h2 className="border-b border-line px-4 py-3 font-semibold">Preview</h2><div className="h-[900px] overflow-auto bg-slate-50 p-5"><EmailPreview blocks={rendered} category={category} /></div></section>
  </div></main>;
}

function BlockLibrary({ addBlock, insertPlaceholder }: { addBlock: (kind: BlockKind, label: string, content: string) => void; insertPlaceholder: (token: string) => void }) {
  return <aside className="rounded-lg border border-line p-3"><p className="mb-4 text-sm text-slate-500">Add a block, then insert placeholders into the focused block.</p>{blockLibrary.map((item) => <button key={item.label} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", JSON.stringify({ type: "block", ...item }))} onClick={() => addBlock(item.kind, item.label, item.content)} className="mb-2 flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-left text-sm hover:bg-slate-50">{item.label}<Copy className="h-3 w-3" /></button>)}<section className="mt-4 border-t border-line pt-4"><h3 className="text-xs font-bold text-slate-600">PLACEHOLDERS</h3><p className="mb-2 text-xs text-slate-500">Drag or click to insert</p><div className="flex flex-wrap gap-1.5">{placeholders.map(([label, token]) => <button key={token} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", JSON.stringify({ type: "placeholder", token }))} onClick={() => insertPlaceholder(token)} className="rounded border border-line bg-white px-2 py-1 text-xs font-semibold">{label}</button>)}</div></section></aside>;
}

function EmailPreview({ blocks, category }: { blocks: TemplateBlock[]; category: Category }) {
  const replace = (text: string) => text.replace(/{{(\w+)}}/g, (_match, key) => sample[key] ?? `{{${key}}}`);
  const heroClasses: Record<Category, string> = { Confirmation: "bg-green-400 text-white", "Check-in": "bg-teal-700 text-white", "Check-out": "bg-blue-600 text-white", Cancellation: "bg-rose-700 text-white", Reminder: "bg-amber-600 text-white", "No-show": "bg-slate-600 text-white", General: "bg-violet-700 text-white" };
  return <div className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-white shadow-sm">{blocks.map((block) => <section key={block.id} className={block.kind === "header" ? `px-8 py-14 text-center ${heroClasses[category]}` : block.kind === "footer" ? "bg-slate-50 px-8 py-7" : "px-8 py-6"}><h3 className={`${block.kind === "header" ? "whitespace-pre-line text-3xl tracking-wide" : "text-lg"} mb-3 font-bold`}>{replace(block.title)}</h3>{replace(block.content).split("\n").map((line, index) => <p key={index} className={`${block.kind === "reservation" ? "border-b border-line py-2" : "mb-2"} whitespace-pre-wrap ${block.kind === "header" ? "text-current/90" : "text-slate-600"}`}>{line || "\u00a0"}</p>)}</section>)}</div>;
}

function fromApiTemplate(template: { id: string; category: EmailTemplateCategory; name: string; subject: string; blocks: TemplateBlock[]; active: boolean; updatedAt: string | null }): EmailTemplate {
  return { ...template, category: categoryLabels[template.category] };
}

function cloneBlocks(blocks: TemplateBlock[]) { return blocks.map((block) => ({ ...block, id: createBlockId() })); }
function createBlockId() { return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
