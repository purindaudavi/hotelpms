"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  BedDouble,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { appName } from "@/app/data/pms-data";
import { LoginShowcase } from "./login-showcase";

const rememberedEmailKey = "staypilot-remembered-email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const brandName = appName.replace(/\s+PMS$/i, "");

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(rememberedEmailKey);

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Enter your email address and password.");
      return;
    }

    setMessage(
      "Sign-in is temporarily unavailable while backend authentication is being configured. Use the demo workspace for development.",
    );
  }

  function openDemoWorkspace() {
    window.localStorage.setItem(
      "staypilot-session",
      JSON.stringify({ email: "demo@staypilot.local", mode: "demo" }),
    );
    router.push("/properties/demo/dashboard");
  }

  function handleForgotPassword() {
    setMessage(
      "Password reset is not configured yet. Contact your property administrator.",
    );
  }

  return (
    <main className="grid min-h-screen bg-[#f7f9fc] lg:grid-cols-[minmax(0,1.08fr)_minmax(500px,0.92fr)]">
      <section className="relative hidden overflow-hidden bg-[#02070c] px-[clamp(28px,3.1vw,54px)] py-10 text-white lg:flex lg:items-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_45%_64%,rgba(0,119,255,0.2),transparent_45%),radial-gradient(circle_at_78%_20%,rgba(0,196,255,0.07),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:46px_46px]" />

        <div className="relative z-10 mx-auto w-full max-w-[815px]">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-xl border border-white/20 bg-white/[0.025] shadow-[0_10px_30px_rgba(0,119,255,0.12)]">
              <BedDouble className="size-8 text-[#0086ff]" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-[28px] font-bold leading-none tracking-[-0.04em]">
                {brandName}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Cloud Property Management System
              </p>
            </div>
          </div>

          <h1 className="mt-8 max-w-[670px] text-[clamp(36px,3vw,51px)] font-bold leading-[1.08] tracking-[-0.045em]">
            Everything your property
            <br />
            needs, in <span className="text-[#087cff]">one workspace.</span>
          </h1>
          <p className="mt-4 max-w-[590px] text-[clamp(15px,1.15vw,19px)] leading-relaxed text-slate-400">
            Manage reservations, rooms, rates, availability, guests, invoices
            and daily hotel operations with clarity.
          </p>

          <LoginShowcase />

          <div className="mt-5 grid grid-cols-3 gap-4">
            {[
              ["bg-[#087cff]", "Live operations"],
              ["bg-emerald-400", "Rates & inventory"],
              ["bg-orange-400", "Channel-ready workflows"],
            ].map(([dotClass, label]) => (
              <div
                className="flex min-w-0 items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.025] px-3 py-3 text-center text-sm font-medium text-slate-200"
                key={label}
              >
                <span className={`size-2.5 shrink-0 rounded-full ${dotClass}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute -left-24 top-[-120px] size-[380px] rounded-full bg-cyan-100/45 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-28 size-[460px] rounded-full bg-blue-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-[390px] rotate-[-8deg] opacity-30 [background-image:repeating-linear-gradient(135deg,rgba(52,114,210,0.2)_0,rgba(52,114,210,0.2)_1px,transparent_1px,transparent_15px)]" />

        <div className="relative z-10 w-full max-w-[515px] rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.13)] sm:p-10 lg:p-[42px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-cyan-50">
              <BedDouble className="size-6 text-blue-600" />
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-950">
                {brandName}
              </p>
              <p className="text-xs text-slate-500">Property Management System</p>
            </div>
          </div>

          <span className="grid size-[70px] place-items-center rounded-xl bg-cyan-100/80">
            <Building2 className="size-9 text-[#087cff]" strokeWidth={1.8} />
          </span>

          <h2 className="mt-6 text-[35px] font-bold leading-none tracking-[-0.04em] text-[#071635]">
            Welcome back
          </h2>
          <p className="mt-3 text-[15px] text-slate-500">
            Sign in to access your property workspace.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">
                Email address
              </span>
              <span className="flex h-[50px] items-center rounded-lg border border-slate-300 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                <Mail className="mr-3 size-[18px] shrink-0 text-slate-400" />
                <input
                  autoComplete="email"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@property.com"
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">
                Password
              </span>
              <span className="flex h-[50px] items-center rounded-lg border border-slate-300 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                <LockKeyhole className="mr-3 size-[18px] shrink-0 text-slate-400" />
                <input
                  autoComplete="current-password"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="ml-2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="size-[18px]" />
                  ) : (
                    <Eye className="size-[18px]" />
                  )}
                </button>
              </span>
            </label>

            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2.5 text-slate-500">
                <input
                  checked={rememberMe}
                  className="size-5 rounded border-slate-300 accent-blue-600"
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                Remember me
              </label>
              <button
                className="font-medium text-blue-600 transition hover:text-blue-800 hover:underline"
                onClick={handleForgotPassword}
                type="button"
              >
                Forgot password?
              </button>
            </div>

            {message ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
                {message}
              </p>
            ) : null}

            <button
              className="flex h-[50px] w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#0868ef] to-[#087cff] text-sm font-semibold text-white shadow-[0_10px_25px_rgba(8,124,255,0.23)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
              disabled={loading}
              type="submit"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-[#102044] transition hover:border-blue-300 hover:bg-blue-50/50"
            onClick={openDemoWorkspace}
            type="button"
          >
            <Monitor className="size-[18px]" />
            Explore demo workspace
          </button>

          <p className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="size-4" />
            Secure access <span aria-hidden="true">•</span> Activity audited
          </p>
        </div>
      </section>
    </main>
  );
}
