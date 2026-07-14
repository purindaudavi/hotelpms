export function DashboardPanel({
  title,
  subtitle,
  children,
  action,
  className = ""
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AnalyticsCard({
  title,
  subtitle,
  action,
  children
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
          <p className="mt-1 text-base text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
