"use client";
import { type DragEvent, useMemo, useState } from "react";
import { readLocalStorageValue, useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, GripVertical, Mail, Plus, Trash2 } from "lucide-react";
const categories = ["Confirmation", "Check-in", "Check-out", "Cancellation", "Reminder", "No-show", "General"] as const;
type Category = (typeof categories)[number];
type BlockKind = "header" | "reservation" | "custom" | "footer";
type TemplateBlock = {
    id: string;
    kind: BlockKind;
    title: string;
    content: string;
};
type EmailTemplate = {
    id: string;
    category: Category;
    name: string;
    blocks: TemplateBlock[];
    updatedAt: string;
};
const placeholders = [
    ["Guest Name", "{{guestName}}"], ["Hotel Name", "{{hotelName}}"], ["Hotel Phone", "{{hotelPhone}}"], ["Reservation No", "{{reservationNo}}"],
    ["Booking Source", "{{bookingSource}}"], ["Payment", "{{payment}}"], ["Check-in Date", "{{checkInDate}}"], ["Check-out Date", "{{checkOutDate}}"],
    ["Nights", "{{nights}}"], ["Rooms Count", "{{roomsCount}}"], ["Total Amount", "{{totalAmount}}"], ["Currency", "{{currency}}"],
    ["Guest Email", "{{guestEmail}}"], ["Guest Country", "{{guestCountry}}"], ["Special Requests", "{{specialRequests}}"]
] as const;
const sample: Record<string, string> = { guestName: "John Smith", hotelName: "Ronaka Airport Transit Hotel", hotelPhone: "+94 70 355 1340", reservationNo: "HM-24018", bookingSource: "Direct", payment: "Paid", checkInDate: "Monday, June 15 2026", checkOutDate: "Wednesday, June 17 2026", nights: "2", roomsCount: "1", totalAmount: "520.00", currency: "LKR", guestEmail: "john@example.com", guestCountry: "United Kingdom", specialRequests: "Late check-in" };
const library: {
    group: string;
    items: {
        label: string;
        kind: BlockKind;
        content: string;
    }[];
}[] = [
    { group: "HEADERS · Booking confirmed", items: [
            { label: "Centered", kind: "header", content: "Thank you for your booking!\n\nDear {{guestName}},\nWe are delighted to confirm your reservation at {{hotelName}}." },
            { label: "Blue bar", kind: "header", content: "Booking confirmed — Reservation {{reservationNo}}\nBooking Source: {{bookingSource}}" }
        ] },
    { group: "BODY · Reservation details", items: [{ label: "Summary", kind: "reservation", content: "Check-in: {{checkInDate}}\nCheck-out: {{checkOutDate}}\nDuration: {{nights}} nights\nRooms: {{roomsCount}}\nPayment: {{payment}}\nTotal: {{currency}} {{totalAmount}}\nSpecial requests: {{specialRequests}}" }] },
    { group: "BODY · Custom (blank)", items: [{ label: "Blank", kind: "custom", content: "Write your custom message here." }] },
    { group: "FOOTERS · Sign-off", items: [{ label: "Standard", kind: "footer", content: "We look forward to welcoming you!\nIf you have any questions, contact {{hotelName}} at {{hotelPhone}}." }] }
];
// -----------------------------------------------------------------------------
// CHECK-IN TEMPLATE
// Keep check-in-specific defaults here so this email can evolve independently.
// -----------------------------------------------------------------------------
function checkInDefaultBlocks(): TemplateBlock[] {
    return [
        {
            id: `check-in-header-${Date.now()}`,
            kind: "header",
            title: "WELCOME\n{{hotelName}}",
            content: "Dear {{guestName}},\n\nWarm greetings from {{hotelName}}!\n\nWe are delighted to welcome you and thank you for choosing to stay with us."
        },
        {
            id: `check-in-details-${Date.now()}`,
            kind: "reservation",
            title: "Your stay details",
            content: "Reservation: {{reservationNo}}\nCheck-in: {{checkInDate}}\nCheck-out: {{checkOutDate}}\nNights: {{nights}}\nRooms: {{roomsCount}}\nSpecial requests: {{specialRequests}}"
        },
        {
            id: `check-in-footer-${Date.now()}`,
            kind: "footer",
            title: "Your comfort is our priority",
            content: "Should you need assistance during your stay, please contact our Front Desk at {{hotelPhone}}.\n\nBreakfast: [Time & Location]\nWi-Fi: Network – [Name] | Password – [Password]"
        }
    ];
}
// -----------------------------------------------------------------------------
// CHECK-OUT TEMPLATE
// Keep check-out-specific defaults here so this email can evolve independently.
// -----------------------------------------------------------------------------
function checkOutDefaultBlocks(): TemplateBlock[] {
    return [
        {
            id: `check-out-header-${Date.now()}`,
            kind: "header",
            title: "THANK YOU\n{{hotelName}}",
            content: "Dear {{guestName}},\n\nThank you for choosing {{hotelName}}!\n\nWe hope you had a wonderful stay with us and look forward to welcoming you back soon."
        },
        {
            id: `check-out-details-${Date.now()}`,
            kind: "reservation",
            title: "Your completed stay",
            content: "Reservation: {{reservationNo}}\nCheck-in: {{checkInDate}}\nCheck-out: {{checkOutDate}}\nDuration: {{nights}} nights\nFinal total: {{currency}} {{totalAmount}}\nPayment: {{payment}}"
        },
        {
            id: `check-out-footer-${Date.now()}`,
            kind: "footer",
            title: "We would love to welcome you again",
            content: "Thank you for being our guest. For future reservations, contact {{hotelName}} at {{hotelPhone}}."
        }
    ];
}

// -----------------------------------------------------------------------------
// CANCELLATION TEMPLATE
// Sent after a reservation has been cancelled.
// -----------------------------------------------------------------------------
function cancellationDefaultBlocks(): TemplateBlock[] {
    return [
        {
            id: `cancellation-header-${Date.now()}`,
            kind: "header",
            title: "RESERVATION CANCELLED",
            content: "Dear {{guestName}},\n\nYour reservation {{reservationNo}} at {{hotelName}} has been cancelled."
        },
        {
            id: `cancellation-details-${Date.now()}`,
            kind: "reservation",
            title: "Cancelled reservation details",
            content: "Reservation: {{reservationNo}}\nOriginal check-in: {{checkInDate}}\nOriginal check-out: {{checkOutDate}}\nRooms: {{roomsCount}}\nBooking source: {{bookingSource}}\nPayment status: {{payment}}"
        },
        {
            id: `cancellation-footer-${Date.now()}`,
            kind: "footer",
            title: "We hope to welcome you another time",
            content: "If you have questions about this cancellation, contact {{hotelName}} at {{hotelPhone}}."
        }
    ];
}

// -----------------------------------------------------------------------------
// REMINDER TEMPLATE
// Sent before arrival to remind the guest about their upcoming stay.
// -----------------------------------------------------------------------------
function reminderDefaultBlocks(): TemplateBlock[] {
    return [
        {
            id: `reminder-header-${Date.now()}`,
            kind: "header",
            title: "YOUR STAY IS COMING UP",
            content: "Dear {{guestName}},\n\nThis is a friendly reminder about your upcoming stay at {{hotelName}}."
        },
        {
            id: `reminder-details-${Date.now()}`,
            kind: "reservation",
            title: "Upcoming reservation",
            content: "Reservation: {{reservationNo}}\nCheck-in: {{checkInDate}}\nCheck-out: {{checkOutDate}}\nNights: {{nights}}\nRooms: {{roomsCount}}\nBalance/payment: {{payment}}\nSpecial requests: {{specialRequests}}"
        },
        {
            id: `reminder-footer-${Date.now()}`,
            kind: "footer",
            title: "We are preparing for your arrival",
            content: "Please contact {{hotelName}} at {{hotelPhone}} if your arrival plans change."
        }
    ];
}

// -----------------------------------------------------------------------------
// NO-SHOW TEMPLATE
// Sent when a guest did not arrive for the booked reservation.
// -----------------------------------------------------------------------------
function noShowDefaultBlocks(): TemplateBlock[] {
    return [
        {
            id: `no-show-header-${Date.now()}`,
            kind: "header",
            title: "WE MISSED YOU",
            content: "Dear {{guestName}},\n\nOur records show that you did not check in for reservation {{reservationNo}}."
        },
        {
            id: `no-show-details-${Date.now()}`,
            kind: "reservation",
            title: "Reservation details",
            content: "Reservation: {{reservationNo}}\nScheduled check-in: {{checkInDate}}\nScheduled check-out: {{checkOutDate}}\nRooms: {{roomsCount}}\nTotal: {{currency}} {{totalAmount}}\nPayment status: {{payment}}"
        },
        {
            id: `no-show-footer-${Date.now()}`,
            kind: "footer",
            title: "Please contact us",
            content: "If this is incorrect or you need help, contact {{hotelName}} at {{hotelPhone}}."
        }
    ];
}

// -----------------------------------------------------------------------------
// GENERAL TEMPLATE
// A flexible email that can be used for announcements or custom guest messages.
// -----------------------------------------------------------------------------
function generalDefaultBlocks(): TemplateBlock[] {
    return [
        {
            id: `general-header-${Date.now()}`,
            kind: "header",
            title: "A MESSAGE FROM {{hotelName}}",
            content: "Dear {{guestName}},"
        },
        {
            id: `general-message-${Date.now()}`,
            kind: "custom",
            title: "Your message",
            content: "Write your message to the guest here. You can insert any placeholder from the block library."
        },
        {
            id: `general-footer-${Date.now()}`,
            kind: "footer",
            title: "Kind regards",
            content: "{{hotelName}}\n{{hotelPhone}}"
        }
    ];
}

function defaultBlocks(category: Category): TemplateBlock[] {
    if (category === "Check-in")
        return checkInDefaultBlocks();
    if (category === "Check-out")
        return checkOutDefaultBlocks();
    if (category === "Cancellation")
        return cancellationDefaultBlocks();
    if (category === "Reminder")
        return reminderDefaultBlocks();
    if (category === "No-show")
        return noShowDefaultBlocks();
    if (category === "General")
        return generalDefaultBlocks();
    const heading = category === "Confirmation" ? "Thank you for your booking!" : `${category} information`;
    return [
        { id: `header-${Date.now()}`, kind: "header", title: "Booking confirmed", content: `${heading}\n\nDear {{guestName}},\nThis is your ${category.toLowerCase()} email from {{hotelName}}.` },
        { id: `body-${Date.now()}`, kind: "reservation", title: "Reservation details", content: library[1].items[0].content },
        { id: `footer-${Date.now()}`, kind: "footer", title: "Sign-off", content: library[3].items[0].content }
    ];
}
export function SettingsTemplatesPage({ propertyId, setToast }: {
    propertyId: string;
    setToast: (message: string) => void;
}) {
    const [category, setCategory] = useState<Category>("Confirmation");
    const [templates, setTemplates] = useLocalStorageState<EmailTemplate[]>(`staypilot:${propertyId}:settings:email-templates`, () => readLocalStorageValue("staypilot.settings.emailTemplates", []));
    const [editing, setEditing] = useState<EmailTemplate | "new" | null>(null);
    const categoryTemplates = templates.filter((template) => template.category === category);
    if (editing)
        return <TemplateBuilder initial={editing === "new" ? null : editing} initialCategory={category} onCancel={() => setEditing(null)} onSave={(template) => { setTemplates((items) => items.some((item) => item.id === template.id) ? items.map((item) => item.id === template.id ? template : item) : [...items, template]); setCategory(template.category); setEditing(null); setToast("Email template saved for this session"); }}/>;
    return <main className="p-4 lg:p-6"><div className="grid gap-6 lg:grid-cols-[230px_1fr]">
    <aside className="border-r border-line pr-4"><h2 className="mb-3 font-semibold text-slate-500">Email Category</h2><nav className="space-y-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-semibold ${category === item ? "bg-ink text-white" : "hover:bg-slate-100"}`}><Mail className="h-4 w-4"/>{item}</button>)}</nav></aside>
    <section><header className="mb-5 flex items-center justify-between"><h1 className="text-xl font-semibold">Templates: {category}</h1><button onClick={() => setEditing("new")} className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Create Template</button></header>
      <DefaultPreview category={category}/>
      {categoryTemplates.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{categoryTemplates.map((template) => <article key={template.id} className="rounded-lg border border-line p-5"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{template.name}</h3><p className="mt-1 text-sm text-slate-500">{template.blocks.length} blocks · Updated {new Date(template.updatedAt).toLocaleString()}</p></div><button onClick={() => setEditing(template)} className="h-10 rounded-md border border-line px-4 text-sm font-semibold">View / Edit</button></div></article>)}</div> : <p className="mt-10 text-slate-500">No template in this category yet. Create one to customize the email body with placeholders.</p>}
    </section>
  </div></main>;
}
function DefaultPreview({ category }: {
    category: Category;
}) {
    const descriptions: Record<Category, string> = {
        Confirmation: "Without a saved Confirmation template, guests receive the standard booking email.",
        "Check-in": "If you have not saved a Check-in template, guests receive this full welcome email.",
        "Check-out": "Without a saved Check-out template, guests receive the full thank-you email.",
        Cancellation: "Without a saved Cancellation template, guests receive this reservation cancellation notice.",
        Reminder: "Without a saved Reminder template, guests receive this upcoming-stay reminder.",
        "No-show": "Without a saved No-show template, guests receive this missed-arrival notice.",
        General: "Use a General template for announcements and other custom guest messages."
    };
    const description = `${descriptions[category]} Create a template to arrange your own message and reservation placeholders.`;
    return (<article className="rounded-lg border border-line p-5">
      <h3 className="font-semibold">Default {category.toLowerCase()} email</h3>
      <p className="mt-3 text-slate-500">{description}</p>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
        Sample preview — guest details are illustrative; hotel data comes from the selected property
      </p>
      <div className="mt-3 max-h-[550px] overflow-y-auto rounded-lg bg-slate-100 p-6">
        <EmailPreview blocks={defaultBlocks(category)} category={category}/>
      </div>
      {category === "Check-in" ? (<div className="mt-4 rounded-lg border border-line bg-slate-50 p-4 text-sm text-slate-600">
          <strong className="mb-2 block text-xs uppercase">Text suggested when you create a Check-in template</strong>
          Warm greetings from all of us at [Hotel Name]! Your comfort is our priority. Add breakfast, Wi-Fi,
          Front Desk, and other arrival information by editing the default blocks.
        </div>) : null}
    </article>);
}
function TemplateBuilder({ initial, initialCategory, onCancel, onSave }: {
    initial: EmailTemplate | null;
    initialCategory: Category;
    onCancel: () => void;
    onSave: (template: EmailTemplate) => void;
}) {
    const [category, setCategory] = useState(initial?.category ?? initialCategory);
    const [name, setName] = useState(initial?.name ?? initialCategory);
    const [blocks, setBlocks] = useState<TemplateBlock[]>(initial?.blocks ?? defaultBlocks(initialCategory));
    const [focused, setFocused] = useState<string | null>(blocks[0]?.id ?? null);
    const rendered = useMemo(() => blocks, [blocks]);
    function addBlock(kind: BlockKind, label: string, content: string) { const block = { id: `block-${Date.now()}-${Math.random()}`, kind, title: label, content }; setBlocks((items) => [...items, block]); setFocused(block.id); }
    function drop(e: DragEvent) { e.preventDefault(); try {
        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (data.type === "block")
            addBlock(data.kind, data.label, data.content);
        if (data.type === "placeholder")
            insertPlaceholder(data.token);
    }
    catch { /* Ignore external drops. */ } }
    function insertPlaceholder(token: string) { if (!focused)
        return; setBlocks((items) => items.map((block) => block.id === focused ? { ...block, content: `${block.content}${block.content.endsWith(" ") || !block.content ? "" : " "}${token}` } : block)); }
    function move(index: number, direction: -1 | 1) { const next = [...blocks]; const target = index + direction; if (target < 0 || target >= next.length)
        return; [next[index], next[target]] = [next[target], next[index]]; setBlocks(next); }
    return <main className="p-4"><header className="mb-4 flex items-center justify-between border-b border-line pb-4"><button onClick={onCancel} className="inline-flex items-center gap-2 font-semibold"><ArrowLeft className="h-4 w-4"/>Back to templates</button><h1 className="text-xl font-semibold">Create email template</h1><span /></header><div className="grid min-h-[760px] gap-3 xl:grid-cols-[280px_1fr_1fr]">
    <BlockLibrary addBlock={addBlock} insertPlaceholder={insertPlaceholder}/>
    <section className="flex min-h-0 flex-col rounded-lg border border-line"><div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold">Category</span><select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="h-11 w-full rounded-md border border-line bg-white px-3">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="mb-2 block text-sm font-semibold">Template name</span><input value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-md border border-line px-3"/></label><div className="flex gap-2 sm:col-span-2"><button onClick={() => setBlocks(defaultBlocks(category))} className="rounded-md border border-line px-4 py-2 font-semibold">Load default</button><button onClick={() => setBlocks([])} className="px-4 py-2 font-semibold">Start from scratch</button></div></div>
      <p className="border-b border-line px-4 py-3 text-sm text-slate-500">Drag blocks from the left into the area below. Reorder with arrows, edit text in each block.</p><div onDragOver={(e) => e.preventDefault()} onDrop={drop} className="min-h-96 flex-1 space-y-3 overflow-y-auto border-2 border-dashed border-slate-200 p-3">{blocks.length ? blocks.map((block, index) => <article key={block.id} onClick={() => setFocused(block.id)} className={`rounded-lg border bg-white ${focused === block.id ? "border-ocean ring-2 ring-ocean/10" : "border-line"}`}><header className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm"><GripVertical className="h-4 w-4 text-slate-400"/><strong className="flex-1">{block.title}</strong><button onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4"/></button><button onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4"/></button><button onClick={() => setBlocks((items) => items.filter((item) => item.id !== block.id))} className="text-rose-500"><Trash2 className="h-4 w-4"/></button></header><input value={block.title} onChange={(e) => setBlocks((items) => items.map((item) => item.id === block.id ? { ...item, title: e.target.value } : item))} className="mx-3 mt-3 h-9 w-[calc(100%-1.5rem)] rounded border border-line px-2 text-sm font-semibold"/><textarea value={block.content} onFocus={() => setFocused(block.id)} onChange={(e) => setBlocks((items) => items.map((item) => item.id === block.id ? { ...item, content: e.target.value } : item))} className="min-h-28 w-full resize-y p-3 text-sm outline-none"/></article>) : <div className="grid h-80 place-items-center text-center text-slate-400">Drop email blocks here</div>}</div><footer className="flex justify-end gap-3 border-t border-line p-4"><button onClick={onCancel} className="h-11 rounded-md border border-line px-5 font-semibold">Cancel</button><button disabled={!name.trim() || !blocks.length} onClick={() => onSave({ id: initial?.id ?? `template-${Date.now()}`, category, name: name.trim(), blocks, updatedAt: new Date().toISOString() })} className="h-11 rounded-md bg-ink px-5 font-semibold text-white disabled:opacity-40">Create template</button></footer></section>
    <section className="min-w-0 rounded-lg border border-line"><h2 className="border-b border-line px-4 py-3 font-semibold">Preview (what you’re building)</h2><div className="h-[900px] overflow-auto bg-slate-50 p-5"><EmailPreview blocks={rendered} category={category}/></div></section>
  </div></main>;
}
function BlockLibrary({ addBlock, insertPlaceholder }: {
    addBlock: (kind: BlockKind, label: string, content: string) => void;
    insertPlaceholder: (token: string) => void;
}) { return <aside className="rounded-lg border border-line p-3"><p className="mb-4 text-sm text-slate-500">Blocks change by template type. Drag to canvas, click to add.</p>{library.map((group) => <section key={group.group} className="mb-4"><h3 className="mb-2 text-xs font-bold text-slate-600">{group.group}</h3>{group.items.map((item) => <button key={item.label} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ type: "block", ...item }))} onClick={() => addBlock(item.kind, item.label, item.content)} className="mb-2 flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-left text-sm hover:bg-slate-50">{item.label}<Copy className="h-3 w-3"/></button>)}</section>)}<section className="border-t border-line pt-4"><h3 className="text-xs font-bold text-slate-600">PLACEHOLDERS</h3><p className="mb-2 text-xs text-slate-500">Drag or click to insert into focused block</p><div className="flex flex-wrap gap-1.5">{placeholders.map(([label, token]) => <button key={token} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ type: "placeholder", token }))} onClick={() => insertPlaceholder(token)} className="rounded border border-line bg-white px-2 py-1 text-xs font-semibold">{label}</button>)}</div></section></aside>; }
function EmailPreview({ blocks, category }: {
    blocks: TemplateBlock[];
    category: Category;
}) {
    const replace = (text: string) => text.replace(/{{(\w+)}}/g, (_, key) => sample[key] ?? `{{${key}}}`);
    const heroClasses: Record<Category, string> = {
        Confirmation: "bg-white text-ink",
        "Check-in": "bg-slate-800 text-white",
        "Check-out": "bg-emerald-600 text-white",
        Cancellation: "bg-rose-600 text-white",
        Reminder: "bg-amber-500 text-white",
        "No-show": "bg-slate-600 text-white",
        General: "bg-indigo-600 text-white"
    };
    const heroClass = heroClasses[category];
    return (<div className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-white shadow-sm">
      {blocks.map((block) => (<section key={block.id} className={block.kind === "header" ? `px-8 py-14 text-center ${heroClass}` : block.kind === "footer" ? "bg-slate-50 px-8 py-7" : "px-8 py-6"}>
          <h3 className={`${block.kind === "header" ? "whitespace-pre-line text-3xl tracking-wide" : "text-lg"} mb-3 font-bold`}>
            {replace(block.title)}
          </h3>
          {replace(block.content).split("\n").map((line, index) => (<p key={index} className={`${block.kind === "reservation" ? "border-b border-line py-2" : "mb-2"} whitespace-pre-wrap ${block.kind === "header" ? "text-current/90" : "text-slate-600"}`}>
              {line || "\u00a0"}
            </p>))}
        </section>))}
    </div>);
}
