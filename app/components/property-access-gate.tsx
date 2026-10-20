"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { hasStoredWorkspaceSession, loadCurrentSessionUser } from "@/app/lib/current-user";
import { getApiErrorMessage } from "@/app/lib/api";
import { listProperties, rememberProperty } from "@/app/lib/property-workspaces";

export function PropertyAccessGate({ propertyId, children }: { propertyId: string; children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setAllowed(false); setError("");
    if (!hasStoredWorkspaceSession()) { router.replace("/login"); return; }
    if (loadCurrentSessionUser().mode === "demo") {
      if (propertyId === "demo") setAllowed(true);
      else setError("Sign in to open this hotel. Demo mode only opens the preview workspace.");
      return;
    }
    void listProperties().then((properties) => {
      if (!active) return;
      if (!properties.some((property) => property.property_id === propertyId)) {
        setError("This hotel is not available to your account. Select another hotel or ask its owner for access."); return;
      }
      rememberProperty(propertyId); setAllowed(true);
    }).catch((failure) => { if (active) setError(getApiErrorMessage(failure, "Unable to check hotel access. Check the backend connection and retry.")); });
    return () => { active = false; };
  }, [propertyId, router, attempt]);
  if (allowed) return children;
  return <main className="app-shell-root grid min-h-screen place-items-center bg-slate-50 p-6 text-ink"><section className="w-full max-w-lg rounded-2xl border border-line bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-semibold">{error ? "Unable to open this hotel" : "Opening your hotel…"}</h1>{error && <><p role="alert" className="mt-3 text-sm text-slate-500">{error}</p><div className="mt-6 flex flex-wrap justify-center gap-4"><button onClick={() => setAttempt((value) => value + 1)} className="font-semibold text-blue-600">Retry</button><Link href="/properties" className="font-semibold text-blue-600">Your properties</Link><Link href="/login" className="font-semibold text-blue-600">Sign in</Link></div></>}</section></main>;
}
