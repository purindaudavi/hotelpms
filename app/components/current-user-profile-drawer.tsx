"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleDollarSign,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FinancialTransaction } from "@/app/data/pms-data";
import { getAuthErrorMessage, resetPassword } from "@/app/lib/auth-api";
import { getUserInitials, type SessionUser } from "@/app/lib/current-user";
import {
  listAllFinancialTransactions,
  type BackendFinancialTransaction
} from "@/app/lib/transactions-api";
import {
  listWithdrawals,
  type Withdrawal
} from "@/app/lib/withdrawals-api";

type CurrentUserProfileDrawerProps = {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
  onPasswordChanged: () => void;
  onSignOut: () => void;
  propertyId: string;
  propertyName: string;
  currency: string;
  cachedTransactions: FinancialTransaction[];
};

const permissions = [
  "Dashboard",
  "Front Desk",
  "Reservations",
  "Rooms & Rates",
  "Housekeeping",
  "Financials",
  "Reports",
  "Settings",
  "Night Audit"
] as const;

export function CurrentUserProfileDrawer({
  open,
  onClose,
  user,
  onPasswordChanged,
  onSignOut,
  propertyId,
  propertyName,
  currency,
  cachedTransactions
}: CurrentUserProfileDrawerProps) {
  const [transactions, setTransactions] = useState<BackendFinancialTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityStatus, setSecurityStatus] = useState<"info" | "success" | "error">("info");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      listAllFinancialTransactions(propertyId),
      listWithdrawals(propertyId, { status: "all", limit: 100 })
    ])
      .then(([savedTransactions, savedWithdrawals]) => {
        if (cancelled) return;
        setTransactions(savedTransactions);
        setWithdrawals(savedWithdrawals.withdrawals);
      })
      .catch(() => {
        if (cancelled) return;
        setTransactions([]);
        setWithdrawals([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, propertyId]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  const personalTransactions = useMemo(() => {
    const email = user.email.toLowerCase();
    const name = user.name.toLowerCase();
    return transactions
      .filter((item) => {
        const actorEmail = item.created_by?.email?.toLowerCase() || "";
        const actorName = item.created_by?.name?.toLowerCase() || "";
        return actorEmail === email || actorName === name;
      })
      .sort((left, right) => Date.parse(right.transaction_date) - Date.parse(left.transaction_date));
  }, [transactions, user.email, user.name]);

  const fallbackActivity = useMemo(() => {
    const email = user.email.toLowerCase();
    const name = user.name.toLowerCase();
    return cachedTransactions
      .filter((item) => {
        const actor = item.createdBy.toLowerCase();
        return actor === email || actor === name;
      })
      .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
      .slice(0, 6);
  }, [cachedTransactions, user.email, user.name]);

  const ownerWithdrawals = useMemo(
    () => withdrawals.filter((item) => item.status === "completed" && (
      item.paid_to.toLowerCase() === user.name.toLowerCase() ||
      item.recorded_by?.email?.toLowerCase() === user.email.toLowerCase()
    )),
    [user.email, user.name, withdrawals]
  );

  const withdrawalTotal = ownerWithdrawals
    .filter((item) => item.currency === currency)
    .reduce((sum, item) => sum + item.effective_amount, 0);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityMessage("");
    setSecurityStatus("info");

    if (!currentPassword || !newPassword) {
      setSecurityMessage("Current password and new password are required.");
      setSecurityStatus("error");
      return;
    }

    if (newPassword.length < 6) {
      setSecurityMessage("Use at least 6 characters for the new password.");
      setSecurityStatus("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage("New password and confirmation do not match.");
      setSecurityStatus("error");
      return;
    }

    setSavingPassword(true);
    try {
      const result = await resetPassword(currentPassword, newPassword);
      setSecurityMessage(`${result}. Sign in again to continue.`);
      setSecurityStatus("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(onPasswordChanged, 900);
    } catch (error) {
      setSecurityMessage(getAuthErrorMessage(error, "Password could not be reset."));
      setSecurityStatus("error");
    } finally {
      setSavingPassword(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="h-full w-full max-w-[680px] overflow-y-auto border-l border-line bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="current-user-profile-title"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white/95 px-6 py-6 backdrop-blur">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full property-accent-soft text-xl font-bold property-accent-text">
              {getUserInitials(user)}
            </div>
            <div className="min-w-0">
              <h2 id="current-user-profile-title" className="truncate text-2xl font-bold">{user.name}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">{user.role}</p>
              <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onSignOut} aria-label="Sign out" className="rounded-md border border-line p-2 text-slate-500 hover:bg-slate-50">
              <LogOut className="h-5 w-5" />
            </button>
            <button type="button" onClick={onClose} aria-label="Close profile" className="rounded-md border border-line p-2 text-slate-500 hover:bg-slate-50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="space-y-6 p-6">
          <section className="rounded-xl border border-line p-5">
            <SectionTitle icon={UserRound} title="Profile details" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail icon={BadgeCheck} label="Employee No." value={user.empNo || "-"} />
              <Detail icon={Activity} label="Status" value="Active" />
              <Detail icon={Building2} label="Role" value={user.role || "Staff"} />
              <Detail icon={CalendarDays} label="Session" value={user.mode === "demo" ? "Demo workspace" : "Authenticated"} />
              <Detail icon={Mail} label="Email" value={user.email} />
              <Detail icon={Phone} label="Phone" value={user.mobile || "-"} />
            </div>
          </section>

          <section className="rounded-xl border border-line p-5">
            <SectionTitle icon={Building2} title="Property access" />
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <p className="font-semibold">{propertyName}</p>
              <p className="mt-1 text-sm text-slate-500">Property ID: {propertyId}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <span key={permission} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {permission}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-line p-5">
            <SectionTitle icon={CircleDollarSign} title="Owner financial activity" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Summary label="Completed withdrawals" value={String(ownerWithdrawals.length)} />
              <Summary label={`Withdrawals (${currency})`} value={money(withdrawalTotal, currency)} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              The hotel opening balance is a property accounting figure, so it remains under Financials → Transactions and is not treated as Asiri&apos;s personal balance.
            </p>
          </section>

          <section className="rounded-xl border border-line p-5">
            <SectionTitle icon={Activity} title="My recent financial actions" />
            <div className="mt-4 space-y-3">
              {loading ? <EmptyActivity text="Loading activity..." /> : null}
              {!loading && personalTransactions.slice(0, 6).map((item) => (
                <article key={item._id} className="rounded-lg border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{transactionLabel(item.source_type)}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.description || item.source_number}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{money(item.amount, item.currency)}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{dateTime(item.transaction_date)} · {item.transaction_no}</p>
                </article>
              ))}
              {!loading && personalTransactions.length === 0 && fallbackActivity.map((item) => (
                <article key={item.id} className="rounded-lg border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.type}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.documentNo}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{money(item.value, currency)}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{dateTime(item.date)} · Local cache</p>
                </article>
              ))}
              {!loading && personalTransactions.length === 0 && fallbackActivity.length === 0 ? (
                <EmptyActivity text="No activity has been recorded for this user yet." />
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-line p-5">
            <SectionTitle icon={ShieldCheck} title="Account security" />
            {user.mode === "demo" ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Demo access does not use backend credentials.
              </p>
            ) : (
              <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
                <SecurityField
                  label="Current password"
                  onChange={setCurrentPassword}
                  placeholder="Enter current password"
                  value={currentPassword}
                />
                <SecurityField
                  label="New password"
                  onChange={setNewPassword}
                  placeholder="Enter new password"
                  value={newPassword}
                />
                <SecurityField
                  label="Confirm password"
                  onChange={setConfirmPassword}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                />
                {securityMessage ? (
                  <p className={`rounded-lg border px-4 py-3 text-sm ${
                    securityStatus === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : securityStatus === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : "border-sky-200 bg-sky-50 text-sky-800"
                  }`}>
                    {securityMessage}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" />
                  {savingPassword ? "Updating..." : "Update password"}
                </button>
              </form>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return <h3 className="flex items-center gap-2 text-lg font-bold"><Icon className="h-5 w-5 property-accent-text" />{title}</h3>;
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div></div>;
}

function SecurityField({
  label,
  onChange,
  placeholder,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <input
        autoComplete="new-password"
        className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="password"
        value={value}
      />
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}

function EmptyActivity({ text }: { text: string }) {
  return <div className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{text}</div>;
}

function money(value: number, currency: string) {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function transactionLabel(source: string) {
  return source.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
