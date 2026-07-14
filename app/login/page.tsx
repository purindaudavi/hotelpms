"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, BedDouble, Building2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { appName } from "@/app/data/pms-data";
import { createClient } from "@/app/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!email || !password) {
      setMessage("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage("Supabase Auth did not accept those details. You can still open the demo workspace.");
        return;
      }

      window.localStorage.setItem("staypilot-session", JSON.stringify({ email, mode: "supabase" }));
      router.push("/properties/demo/dashboard");
    } catch {
      setMessage("Supabase is not reachable from this browser. You can still open the demo workspace.");
    } finally {
      setLoading(false);
    }
  }

  function openDemo() {
    window.localStorage.setItem("staypilot-session", JSON.stringify({ email: "demo@staypilot.local", mode: "demo" }));
    router.push("/properties/demo/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-ink">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-ink lg:block">
          <Image
            src="/assets/direct-bookings.jpg"
            alt="Direct booking promotion"
            fill
            priority
            sizes="50vw"
            className="object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(20,22,26,0.92),rgba(20,22,26,0.46))]" />
          <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-ink">
                <BedDouble className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xl font-semibold">{appName}</p>
                <p className="text-sm text-white/70">Cloud PMS workspace</p>
              </div>
            </div>
            <div className="max-w-xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/85">
                <ShieldCheck className="h-4 w-4" />
                Front desk, bookings, POS, housekeeping, and channel operations
              </p>
              <h1 className="text-5xl font-semibold leading-tight">Run daily hotel operations from one focused console.</h1>
              <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
                {["Live room grid", "Direct bookings", "Financial control"].map((item) => (
                  <div key={item} className="rounded-lg border border-white/15 bg-white/10 p-4">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-white">
                <BedDouble className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xl font-semibold">{appName}</p>
                <p className="text-sm text-slate-500">Cloud PMS workspace</p>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-white p-6 shadow-panel">
              <div className="mb-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-50 text-ocean">
                  <Building2 className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold">Sign in</h2>
                <p className="mt-1 text-sm text-slate-500">Access your property workspace.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      className="focus-ring h-11 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm"
                      placeholder="name@property.com"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      autoComplete="current-password"
                      className="focus-ring h-11 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm"
                      placeholder="Your password"
                    />
                  </span>
                </label>

                {message ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div>
                ) : null}

                <button
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? "Checking..." : "Sign in"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <button
                type="button"
                onClick={openDemo}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Open demo workspace
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
