"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BookOpenCheck,
  CheckCheck,
  CircleDollarSign,
  CreditCard,
  FileMinus2,
  FileText,
  HandCoins,
  LoaderCircle,
  Package,
  ReceiptText,
  RefreshCw,
  WalletCards
} from "lucide-react";
import {
  getNotificationsApiErrorMessage,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationType,
  type PmsNotification
} from "@/app/lib/notifications-api";

export function NotificationMenu({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<PmsNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await listNotifications(propertyId);
      setNotifications(response.notifications);
      setError("");
    } catch (loadError) {
      setError(getNotificationsApiErrorMessage(loadError));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load(true);
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [load, open]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  async function openNotification(notification: PmsNotification) {
    setNotifications((current) => current.map((item) =>
      item.id === notification.id ? { ...item, read: true } : item
    ));
    setOpen(false);
    router.push(notification.href);
    if (!notification.read) {
      try {
        await markNotificationRead(propertyId, notification.id);
      } catch {
        void load(true);
      }
    }
  }

  async function markAllRead() {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    try {
      await markAllNotificationsRead(propertyId);
    } catch (markError) {
      setError(getNotificationsApiErrorMessage(markError));
      void load(true);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {unreadCount ? (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-5 text-white ">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section className="absolute right-0 top-12 z-50 w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="font-semibold text-slate-950">Notifications</h2>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount ? (
                <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              ) : null}
              <button type="button" aria-label="Refresh notifications" onClick={() => void load()} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </header>

          <div className="table-scroll max-h-[min(620px,calc(100vh-120px))] overflow-y-auto">
            {loading && !notifications.length ? (
              <div className="grid min-h-40 place-items-center text-sm text-slate-500">
                <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading notifications</span>
              </div>
            ) : error && !notifications.length ? (
              <div className="p-5 text-center text-sm text-rose-700">{error}</div>
            ) : notifications.length ? (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void openNotification(notification)}
                  className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 ${notification.read ? "bg-white" : "bg-blue-50/60"}`}
                >
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${notificationTone(notification.type)}`}>
                    <NotificationIcon type={notification.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{notification.title}</span>
                      {!notification.read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" /> : null}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-600">{notification.message}</span>
                    <span className="mt-1.5 block text-[11px] text-slate-400">{relativeTime(notification.timestamp)}</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="grid min-h-40 place-items-center p-5 text-center">
                <div>
                  <Bell className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">No notifications yet</p>
                  <p className="mt-1 text-xs text-slate-500">New booking and financial records will appear here.</p>
                </div>
              </div>
            )}
          </div>
          {error && notifications.length ? <p className="border-t border-line bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function NotificationIcon({ type }: { type: NotificationType }) {
  const className = "h-4 w-4";
  if (type === "booking") return <BookOpenCheck className={className} />;
  if (type === "invoice") return <FileText className={className} />;
  if (type === "payment") return <CreditCard className={className} />;
  if (type === "credit_note") return <FileMinus2 className={className} />;
  if (type === "refund") return <HandCoins className={className} />;
  if (type === "withdrawal") return <WalletCards className={className} />;
  if (type === "purchase") return <Package className={className} />;
  if (type === "expense") return <ReceiptText className={className} />;
  return <CircleDollarSign className={className} />;
}

function notificationTone(type: NotificationType) {
  if (type === "booking") return "bg-blue-100 text-blue-700";
  if (type === "refund" || type === "withdrawal" || type === "expense") return "bg-orange-100 text-orange-700";
  if (type === "payment") return "bg-emerald-100 text-emerald-700";
  if (type === "credit_note") return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-700";
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const difference = Date.now() - timestamp;
  if (!Number.isFinite(timestamp)) return "Recently";
  if (difference < 60_000) return "Just now";
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)} min ago`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)} hr ago`;
  if (difference < 604_800_000) return `${Math.floor(difference / 86_400_000)} days ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
