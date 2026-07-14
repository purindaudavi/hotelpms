"use client";

import { Plug } from "lucide-react";

export function IntegrationsPage() {
  return (
    <main className="space-y-7 p-4 lg:p-6">
      <section>
        <h2 className="text-2xl font-semibold">Integrations</h2>
        <p className="mt-2 text-lg text-slate-500">Manage and sync data with your connected third-party applications.</p>
      </section>

      <section className="rounded-lg border border-line bg-white shadow-sm">
        <div className="grid min-h-[270px] place-items-center px-5 py-12 text-center">
          <div>
            <Plug className="mx-auto h-12 w-12 text-slate-500" />
            <p className="mt-4 text-lg font-semibold">No active integrations</p>
            <p className="mt-2 text-sm text-slate-500">
              There are no active integrations configured for this property. Contact your administrator to enable an integration.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
