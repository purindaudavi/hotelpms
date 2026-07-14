"use client";

import { ClipboardList, Send, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { channelMessagesKey } from "@/app/components/modules/channelmanager/session";

type ChannelManagerMessagePageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

type ChannelMessage = {
  id: string;
  guest: string;
  channel: string;
  subject: string;
  lastMessage: string;
  updatedAt: string;
  status: "Open" | "Closed";
};

const demoMessages: ChannelMessage[] = [
  {
    id: "msg-001",
    guest: "Daniel Wijekoon",
    channel: "Agoda",
    subject: "Arrival time confirmation",
    lastMessage: "Guest asked whether early check-in is available.",
    updatedAt: "Jun 15, 2026 19:31",
    status: "Open"
  },
  {
    id: "msg-002",
    guest: "Siva Kailasam",
    channel: "Expedia",
    subject: "Airport transfer",
    lastMessage: "Property replied with shuttle counter details.",
    updatedAt: "Jun 12, 2026 08:10",
    status: "Closed"
  }
];

export function ChannelManagerMessagePage({ propertyId, setToast }: ChannelManagerMessagePageProps) {
  const [chatInstalled, setChatInstalled] = useSessionState(`staypilot:${propertyId}:channel-manager:chat-installed`, false);
  const [messages, setMessages] = useSessionState<ChannelMessage[]>(channelMessagesKey(propertyId), []);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleMessages = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return messages.filter((message) => !needle || [message.guest, message.channel, message.subject, message.lastMessage].join(" ").toLowerCase().includes(needle));
  }, [messages, search]);

  const selected = visibleMessages.find((message) => message.id === selectedId) ?? visibleMessages[0] ?? null;

  function installChatTemplate() {
    setChatInstalled(true);
    setMessages((current) => (current.length ? current : demoMessages));
    setToast("Chat message template enabled for this session");
  }

  function sendReply() {
    if (!selected || !reply.trim()) return;
    setMessages((current) =>
      current.map((message) =>
        message.id === selected.id
          ? {
              ...message,
              lastMessage: reply.trim(),
              updatedAt: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
              status: "Open"
            }
          : message
      )
    );
    setReply("");
    setToast("Message saved in this session");
  }

  if (!chatInstalled) {
    return (
      <main className="grid min-h-[calc(100vh-72px)] place-items-center bg-white px-4 py-4 text-center text-slate-400">
        <div>
          <div className="relative mx-auto mb-6 grid h-44 w-44 place-items-center rounded-full bg-slate-50">
            <ClipboardList className="h-24 w-24 text-slate-300" />
            <span className="absolute right-7 top-7 text-4xl font-semibold text-slate-300">Z</span>
            <span className="absolute right-4 top-14 text-3xl font-semibold text-slate-300">z</span>
          </div>
          <p className="text-lg">
            This property does not have the chat app installed, please go{" "}
            <button type="button" onClick={installChatTemplate} className="font-semibold text-blue-500 hover:text-blue-700">
              here
            </button>{" "}
            to add chat
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-4 py-4">
      <section className="rounded-md border border-line bg-white">
        <div className="flex flex-wrap items-center border-b border-line">
          <label className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages" className="focus-ring h-12 w-full border-0 bg-white pl-11 pr-4 text-sm" />
          </label>
          <button type="button" onClick={() => setToast("Messages refreshed")} className="h-12 px-4 text-sm font-semibold hover:bg-slate-50">
            Refresh
          </button>
        </div>

        <div className="grid min-h-[520px] lg:grid-cols-[360px_1fr]">
          <aside className="border-r border-line">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-lg font-semibold">Channel Messages</h2>
              <p className="text-sm text-slate-500">Template view for OTA guest chat.</p>
            </div>
            <div className="divide-y divide-line">
              {visibleMessages.map((message) => (
                <button key={message.id} type="button" onClick={() => setSelectedId(message.id)} className={`block w-full px-5 py-4 text-left hover:bg-slate-50 ${selected?.id === message.id ? "bg-blue-50" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{message.guest}</span>
                    <span className="text-xs text-slate-500">{message.channel}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{message.subject}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{message.lastMessage}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[520px] flex-col">
            {selected ? (
              <>
                <div className="border-b border-line px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{selected.subject}</h2>
                      <p className="text-sm text-slate-500">
                        {selected.channel} - {selected.updatedAt}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{selected.status}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4 px-6 py-5">
                  <div className="max-w-2xl rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">{selected.lastMessage}</div>
                  <div className="ml-auto max-w-2xl rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-900">Thank you for contacting Ronaka Airport Transit Hotel. We will update the booking notes and reply from this inbox.</div>
                </div>
                <div className="border-t border-line p-5">
                  <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply..." className="focus-ring min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm" />
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={sendReply} className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid flex-1 place-items-center text-center text-slate-400">No messages match the current search.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
